import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useUserIdentity } from './data/useUserIdentity'
import { useBudgetAlerts, useCampaignRealtime } from './data/useRealtimeSubscriptions'

export interface LiveMetrics {
  roi: number
  roiTrend: 'up' | 'down' | 'stable'
  budgetBurnRate: number
  budgetRemaining: number
  activeAgents: string[]
  campaignHealth: 'healthy' | 'warning' | 'critical'
  conversions: number
  conversionRate: number
  impressions: number
  clicks: number
  ctr: number
  lastUpdate: Date
  history: number[] // For sparkline
}

export interface MetricAlert {
  id: string
  type: 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
}

interface UseRealtimeMetricsOptions {
  campaignId?: string
  enableRealtime?: boolean
  mockData?: boolean // For demo/development - fallback when real-time unavailable
}

export function useRealtimeMetrics(options: UseRealtimeMetricsOptions = {}) {
  const { campaignId, enableRealtime = true, mockData = false } = options
  const [mockMetrics, setMockMetrics] = useState<LiveMetrics | null>(null)
  const [alerts, setAlerts] = useState<MetricAlert[]>([])

  // Get user identity for org_id
  const { data: identity } = useUserIdentity()
  const orgId = identity?.organization?.id

  // Real-time subscriptions for live updates using Supabase
  const { latestAlert, isConnected: alertsConnected } = useBudgetAlerts()
  const { campaignUpdate, isConnected: campaignsConnected } = useCampaignRealtime(campaignId)

  // Real-time campaign metrics query using database function
  const metricsQuery = useQuery({
    queryKey: ['campaign-realtime-metrics', orgId, campaignId],
    queryFn: async (): Promise<LiveMetrics | null> => {
      if (!orgId) return null

      const { data, error } = await supabase.rpc('get_campaign_realtime_metrics', {
        p_org_id: orgId
      })

      if (error) {
        console.error('[useRealtimeMetrics] Error fetching metrics:', error)
        throw error
      }

      // If specific campaign requested, filter to that campaign
      const campaignData = campaignId
        ? data?.find((d: any) => d.campaign_id === campaignId)
        : data?.[0] // Get first campaign as default

      if (!campaignData) return null

      // Transform database data to LiveMetrics interface
      return {
        roi: calculateROI(campaignData),
        roiTrend: 'stable', // Will be calculated from real-time updates
        budgetBurnRate: campaignData.budget_utilization || 0,
        budgetRemaining: Math.max(0, campaignData.budget - campaignData.spent),
        activeAgents: ['strategy', 'content', 'analytics'], // Static for now
        campaignHealth: getCampaignHealth(campaignData.alert_level),
        conversions: 0, // Will be extracted from metrics JSONB
        conversionRate: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        lastUpdate: new Date(campaignData.last_updated),
        history: [] // Will be populated from historical data
      }
    },
    enabled: !!orgId && enableRealtime,
    refetchInterval: 30000, // Fallback polling every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  })

  // Helper function to calculate ROI
  const calculateROI = useCallback((campaignData: any): number => {
    if (!campaignData.budget || campaignData.budget === 0) return 0

    // Basic ROI calculation - can be enhanced with actual conversion data
    const spent = campaignData.spent || 0
    const performance = campaignData.performance_score || 0

    // Simple ROI estimate: (performance_score / spent) * 100
    return spent > 0 ? Math.round((performance / spent) * 100) : 0
  }, [])

  // Helper function to map alert level to campaign health
  const getCampaignHealth = useCallback((alertLevel: string): 'healthy' | 'warning' | 'critical' => {
    switch (alertLevel) {
      case 'critical': return 'critical'
      case 'high': return 'critical'
      case 'medium': return 'warning'
      default: return 'healthy'
    }
  }, [])

  // Mock data generator for demo/fallback
  const generateMockMetrics = useCallback((): LiveMetrics => {
    const previousROI = mockMetrics?.roi ?? 150
    const roiChange = (Math.random() - 0.5) * 10
    const newROI = Math.max(0, previousROI + roiChange)
    
    const trend = roiChange > 1 ? 'up' : roiChange < -1 ? 'down' : 'stable'
    
    // Generate history for sparkline
    const history = mockMetrics?.history ?? [150, 148, 152, 149, 155, 151, 153]
    const newHistory = [...history.slice(-19), newROI]
    
    return {
      roi: Number(newROI.toFixed(1)),
      roiTrend: trend,
      budgetBurnRate: Number((Math.random() * 100).toFixed(1)),
      budgetRemaining: Number((Math.random() * 10000 + 5000).toFixed(0)),
      activeAgents: ['strategy', 'content', 'analytics'],
      campaignHealth: newROI > 100 ? 'healthy' : newROI > 50 ? 'warning' : 'critical',
      conversions: Math.floor(Math.random() * 1000 + 500),
      conversionRate: Number((Math.random() * 5 + 2).toFixed(2)),
      impressions: Math.floor(Math.random() * 100000 + 50000),
      clicks: Math.floor(Math.random() * 5000 + 2000),
      ctr: Number((Math.random() * 3 + 1).toFixed(2)),
      lastUpdate: new Date(),
      history: newHistory
    }
  }, [mockMetrics])

  // Merge real-time updates with base query data
  const liveMetrics = useMemo(() => {
    const baseData = metricsQuery.data

    // If we have real-time campaign updates, merge them
    if (campaignUpdate?.new && baseData) {
      const spent = campaignUpdate.new.spent_cents / 100
      const budget = campaignUpdate.new.budget_cents / 100
      const utilization = budget > 0 ? (spent / budget) * 100 : 0

      return {
        ...baseData,
        budgetBurnRate: utilization,
        budgetRemaining: Math.max(0, budget - spent),
        lastUpdate: new Date(campaignUpdate.new.updated_at),
        campaignHealth: utilization >= 100 ? 'critical' : utilization >= 90 ? 'warning' : 'healthy'
      }
    }

    return baseData
  }, [metricsQuery.data, campaignUpdate])

  // Handle real-time budget alerts
  useEffect(() => {
    if (latestAlert) {
      const newAlert: MetricAlert = {
        id: latestAlert.id || `alert-${Date.now()}`,
        type: latestAlert.severity === 'critical' ? 'error' :
              latestAlert.severity === 'high' ? 'error' :
              latestAlert.severity === 'medium' ? 'warning' : 'warning',
        title: latestAlert.title || 'Budget Alert',
        message: latestAlert.message || 'Budget threshold reached',
        timestamp: new Date(latestAlert.created_at || Date.now())
      }

      setAlerts(prev => {
        // Avoid duplicate alerts
        if (prev.some(alert => alert.id === newAlert.id)) {
          return prev
        }
        return [newAlert, ...prev].slice(0, 5) // Keep last 5 alerts
      })
    }
  }, [latestAlert])

  // Mock data fallback when real-time is disabled or no data available
  useEffect(() => {
    if (mockData && (!enableRealtime || !liveMetrics)) {
      // Initial metrics
      const initialMetrics = generateMockMetrics()
      setMockMetrics(initialMetrics)

      // Update every 3 seconds
      const interval = setInterval(() => {
        const newMetrics = generateMockMetrics()
        setMockMetrics(newMetrics)
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [mockData, enableRealtime, liveMetrics, generateMockMetrics])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }, [])

  // Determine which metrics to return (real-time > mock > loading)
  const finalMetrics = liveMetrics || (mockData ? mockMetrics : null)
  const isConnected = alertsConnected || campaignsConnected

  return {
    metrics: finalMetrics,
    alerts,
    isConnected,
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    clearAlerts,
    dismissAlert,
    refetch: metricsQuery.refetch,

    // Real-time connection status
    realtimeStatus: {
      alertsConnected,
      campaignsConnected,
      hasRealtimeData: !!liveMetrics,
      lastUpdate: liveMetrics?.lastUpdate || mockMetrics?.lastUpdate
    }
  }
}