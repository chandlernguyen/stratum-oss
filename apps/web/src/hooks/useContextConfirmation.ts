import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authService';

interface ExtractedContext {
  id: string
  agent_type: string
  extracted_context: {
    [key: string]: any
  }
  confidence_score: number
  created_at: string
}

export function useContextConfirmation() {
  const [pendingContexts, setPendingContexts] = useState<ExtractedContext[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch pending context approvals
  const fetchPendingApprovals = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/v1/business-context/pending-approvals`)

      if (response.ok) {
        const data = await response.json()
        setPendingContexts(data)
      } else {
        console.error('Failed to fetch pending approvals')
      }
    } catch (err) {
      console.error('Error fetching pending approvals:', err)
    }
  }

  // Approve context
  const approveContext = async (historyId: string, editedContext?: any) => {
    setLoading(true)
    setError(null)

    try {
      // If context was edited, update it first
      if (editedContext) {
        const updateResponse = await authFetch(`${API_BASE_URL}/api/v1/business-context/history/${historyId}`, {
          method: 'PUT',
          body: JSON.stringify({
            extracted_context: editedContext
          })
        })

        if (!updateResponse.ok) {
          throw new Error('Failed to update context')
        }
      }

      // Approve the context
      const approveResponse = await authFetch(`${API_BASE_URL}/api/v1/business-context/history/${historyId}/approve`, {
        method: 'PUT'
      })

      if (!approveResponse.ok) {
        throw new Error('Failed to approve context')
      }

      // Remove from pending list
      setPendingContexts(prev => prev.filter(ctx => ctx.id !== historyId))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve context')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Reject context (just remove from pending list)
  const rejectContext = async (historyId: string) => {
    setLoading(true)
    setError(null)

    try {
      // Delete the context history entry
      const response = await authFetch(`${API_BASE_URL}/api/v1/business-context/history/${historyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to reject context')
      }

      // Remove from pending list
      setPendingContexts(prev => prev.filter(ctx => ctx.id !== historyId))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject context')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Trigger context extraction from conversation
  const extractContextFromConversation = async (
    sessionId: string,
    agentType: string,
    conversationText: string
  ) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/v1/business-context/extract-from-conversation`, {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          agent_type: agentType,
          conversation_text: conversationText
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.history_id) {
          // Refresh pending approvals to show the new extraction
          await fetchPendingApprovals()
          return result.history_id
        }
      }

      return null
    } catch (err) {
      console.error('Error extracting context:', err)
      return null
    }
  }

  // Load pending approvals on mount
  useEffect(() => {
    fetchPendingApprovals()
    
    // Poll for new pending approvals every 30 seconds
    const interval = setInterval(fetchPendingApprovals, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return {
    pendingContexts,
    loading,
    error,
    fetchPendingApprovals,
    approveContext,
    rejectContext,
    extractContextFromConversation
  }
}