/**
 * Campaign Plan Prerequisites Hook
 *
 * Manages prerequisite completion state for campaign plans with:
 * - Optimistic UI updates (instant feedback)
 * - Database persistence
 * - Dynamic readiness score calculation
 * - Error rollback
 *
 * Usage:
 * ```tsx
 * const { completedItems, togglePrerequisite, readinessScore, isReady } =
 *   usePrerequisiteCompletion(plan.id, plan.prerequisites)
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useUserIdentity } from '@/hooks/data/useUserIdentity'
import { useMemo, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface PrerequisiteCompletionResult {
  completedItems: Set<string>
  togglePrerequisite: (prereqText: string) => void
  isToggling: boolean
  readinessScore: number
  isReady: boolean
  completionRate: number
  error: Error | null
}

export function usePrerequisiteCompletion(
  planId: string,
  prerequisites: string[] = []
): PrerequisiteCompletionResult {
  const queryClient = useQueryClient()
  const { data: identity } = useUserIdentity()
  const orgId = identity?.user.org_id
  const userId = identity?.user.id
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set())

  // Load completion state from database
  const { data: completionData, error: queryError } = useQuery({
    queryKey: ['plan-prerequisites', planId, orgId],
    queryFn: async () => {
      if (!orgId || !planId) return new Set<string>()

      console.log(`[usePrerequisiteCompletion] Fetching prerequisites for plan=${planId}, org=${orgId}`)

      const { data, error } = await supabase
        .from('campaign_plan_prerequisites')
        .select('prerequisite_text, completed')
        .eq('plan_id', planId)
        .eq('org_id', orgId)
        .eq('completed', true)

      if (error) {
        console.error('[usePrerequisiteCompletion] Failed to load prerequisites:', error)
        throw error
      }

      console.log('[usePrerequisiteCompletion] Raw query data:', data)

      const completed = new Set(data?.map(d => d.prerequisite_text) || [])
      console.log(`[usePrerequisiteCompletion] Loaded ${completed.size} completed prerequisites for plan ${planId}`)

      return completed
    },
    enabled: !!orgId && !!planId && prerequisites.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  })

  // Sync local state with query data
  useEffect(() => {
    if (completionData) {
      setCompletedItems(completionData)
    }
  }, [completionData])

  // Toggle prerequisite with optimistic update
  const togglePrerequisite = useMutation({
    mutationFn: async (prereqText: string) => {
      if (!orgId || !userId) {
        throw new Error('User not authenticated')
      }

      const isCompleted = !completedItems.has(prereqText)

      console.log(`[usePrerequisiteCompletion] Toggling prerequisite: "${prereqText}" to ${isCompleted ? 'completed' : 'incomplete'}`)

      const { error } = await supabase
        .from('campaign_plan_prerequisites')
        .upsert(
          {
            org_id: orgId,
            plan_id: planId,
            user_id: userId,
            prerequisite_text: prereqText,
            completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null
          },
          {
            onConflict: 'org_id,plan_id,prerequisite_text'
          }
        )

      if (error) throw error

      return { prereqText, isCompleted }
    },

    // ✨ OPTIMISTIC UPDATE - UI feels instant
    onMutate: async (prereqText: string) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: ['plan-prerequisites', planId, orgId]
      })

      // Snapshot current state for rollback
      const previousState = queryClient.getQueryData<Set<string>>([
        'plan-prerequisites',
        planId,
        orgId
      ])

      // Optimistically update query cache
      queryClient.setQueryData<Set<string>>(
        ['plan-prerequisites', planId, orgId],
        (old = new Set()) => {
          const next = new Set(old)
          if (next.has(prereqText)) {
            next.delete(prereqText) // Uncheck
          } else {
            next.add(prereqText) // Check
          }
          return next
        }
      )

      // Also update local state for immediate render
      setCompletedItems(prev => {
        const next = new Set(prev)
        if (next.has(prereqText)) {
          next.delete(prereqText)
        } else {
          next.add(prereqText)
        }
        return next
      })

      console.log('[usePrerequisiteCompletion] Optimistic update applied')

      // Return context for error rollback
      return { previousState }
    },

    // ✅ SUCCESS
    onSuccess: (data) => {
      console.log(`[usePrerequisiteCompletion] Successfully toggled "${data.prereqText}" to ${data.isCompleted ? 'completed' : 'incomplete'}`)
    },

    // ❌ ROLLBACK on error
    onError: (err, _prereqText, context) => {
      console.error('[usePrerequisiteCompletion] Failed to toggle prerequisite:', err)

      // Restore previous state
      if (context?.previousState) {
        queryClient.setQueryData(
          ['plan-prerequisites', planId, orgId],
          context.previousState
        )
        setCompletedItems(context.previousState)
      }

      // Show user-friendly error
      toast.error('Failed to update prerequisite. Please try again.')
    },

    // 🔄 REFRESH on settled (ensures sync with server)
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['plan-prerequisites', planId, orgId]
      })
    }
  })

  // Calculate completion rate
  const completionRate = useMemo(() => {
    if (!prerequisites.length) return 1.0
    return completedItems.size / prerequisites.length
  }, [completedItems, prerequisites.length])

  // Calculate dynamic readiness score
  const readinessScore = useMemo(() => {
    if (!prerequisites.length) return 100

    const baseScore = 35 // From LLM plan assessment (plan.initial_readiness_score)
    const maxIncrease = 45 // Can reach 80% by completing all prerequisites

    return Math.round(baseScore + (completionRate * maxIncrease))
  }, [completionRate])

  // Readiness threshold for framework generation
  const isReady = readinessScore >= 70

  return {
    completedItems,
    togglePrerequisite: togglePrerequisite.mutate,
    isToggling: togglePrerequisite.isPending,
    readinessScore,
    isReady,
    completionRate,
    error: queryError || togglePrerequisite.error
  }
}
