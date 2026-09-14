/**
 * Supabase Native Real-time Subscriptions Hook
 *
 * Production-ready hook that leverages Supabase's built-in Realtime service
 * for real-time database change notifications.
 *
 * Features:
 * - Direct Supabase client integration (no custom WebSocket server)
 * - Automatic reconnection and error handling
 * - Organization-level data isolation via RLS
 * - Connection management and cleanup
 * - TypeScript support with proper typing
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

// =============================================================================
// TYPES
// =============================================================================

export interface RealtimeSubscription {
  table: 'campaign_alerts' | 'campaigns' | 'agent_outputs' | 'marketing_strategies';
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string; // e.g., "org_id=eq.123" or "agent_type=eq.persona"
  schema?: string;
}

export interface RealtimeData {
  [channelName: string]: {
    eventType: string;
    new: any;
    old: any;
    table: string;
    timestamp: string;
  };
}

export interface RealtimeConnectionStatus {
  isConnected: boolean;
  connectionCount: number;
  lastError?: string;
  retryCount: number;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useRealtimeSubscriptions(subscriptions: RealtimeSubscription[]) {
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({});
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    isConnected: false,
    connectionCount: 0,
    retryCount: 0
  });

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  // Update realtime data with timestamp
  const updateRealtimeData = useCallback((channelName: string, payload: any) => {
    console.log(`[Realtime] ${channelName} update:`, payload);

    setRealtimeData(prev => ({
      ...prev,
      [channelName]: {
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
        table: payload.table || payload.schema,
        timestamp: new Date().toISOString()
      }
    }));
  }, []);

  // Connection status tracking
  const updateConnectionStatus = useCallback((updates: Partial<RealtimeConnectionStatus>) => {
    setConnectionStatus(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    if (!orgId || subscriptions.length === 0) {
      // Reset state when no org or subscriptions
      setRealtimeData({});
      setConnectionStatus({
        isConnected: false,
        connectionCount: 0,
        retryCount: 0
      });
      return;
    }

    console.log(`[Realtime] Setting up ${subscriptions.length} subscriptions for org ${orgId}`);

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      console.log(`[Realtime] Removing existing channel:`, channel);
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    let connectedChannels = 0;
    const totalChannels = subscriptions.length;

    // Create channels for each subscription
    const channels = subscriptions.map((subscription, index) => {
      const channelName = `${subscription.table}-${orgId}-${index}`;

      // Build filter with org_id unless explicitly overridden
      const filter = subscription.filter || `org_id=eq.${orgId}`;

      console.log(`[Realtime] Creating channel ${channelName} with filter: ${filter}`);

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          {
            event: subscription.event || '*',
            schema: subscription.schema || 'public',
            table: subscription.table,
            filter: filter
          },
          (payload: any) => {
            updateRealtimeData(channelName, payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Channel ${channelName} status:`, status);

          if (status === 'SUBSCRIBED') {
            connectedChannels++;

            if (connectedChannels === totalChannels) {
              updateConnectionStatus({
                isConnected: true,
                connectionCount: connectedChannels,
                lastError: undefined
              });
              console.log(`[Realtime] All ${totalChannels} channels connected successfully`);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const errorMessage = `Channel ${channelName} failed with status: ${status}`;
            console.error(`[Realtime] ${errorMessage}`);

            setConnectionStatus((prev: any) => ({
              isConnected: false,
              lastError: errorMessage,
              retryCount: prev.retryCount + 1,
              connectionCount: prev.connectionCount
            }));
          }
        });

      return channel;
    });

    channelsRef.current = channels;

    // Cleanup function
    return () => {
      console.log('[Realtime] Cleaning up subscriptions');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];

      setConnectionStatus({
        isConnected: false,
        connectionCount: 0,
        retryCount: 0
      });
    };
  }, [orgId, subscriptions, updateRealtimeData, updateConnectionStatus]);

  // Helper functions
  const getLatestData = useCallback((table: string) => {
    const channelKey = Object.keys(realtimeData).find(key => key.startsWith(table));
    return channelKey ? realtimeData[channelKey] : null;
  }, [realtimeData]);

  const getDataByChannel = useCallback((channelPattern: string) => {
    return Object.entries(realtimeData)
      .filter(([key]) => key.includes(channelPattern))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as RealtimeData);
  }, [realtimeData]);

  return {
    realtimeData,
    connectionStatus,
    isConnected: connectionStatus.isConnected,
    connectionCount: connectionStatus.connectionCount,
    lastError: connectionStatus.lastError,
    retryCount: connectionStatus.retryCount,

    // Helper functions
    getLatestData,
    getDataByChannel,

    // Debug info
    channelCount: channelsRef.current.length,
    orgId
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook specifically for monitoring budget alerts
 */
export function useBudgetAlerts() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  const { realtimeData, isConnected, connectionStatus } = useRealtimeSubscriptions([
    {
      table: 'campaign_alerts',
      event: 'INSERT',
      filter: `org_id=eq.${orgId}`
    }
  ]);

  // Get the latest alert
  const latestAlert = Object.values(realtimeData)[0];

  return {
    latestAlert: latestAlert?.new || null,
    isConnected,
    connectionStatus,
    hasNewAlert: !!latestAlert && latestAlert.eventType === 'INSERT',
    allAlerts: Object.values(realtimeData).map(data => data.new).filter(Boolean)
  };
}

/**
 * Hook for monitoring campaign changes (budget updates, status changes, etc.)
 */
export function useCampaignRealtime(campaignId?: string) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  // Build filter - either specific campaign or all campaigns in org
  const filter = campaignId
    ? `org_id=eq.${orgId}&id=eq.${campaignId}`
    : `org_id=eq.${orgId}`;

  const { realtimeData, isConnected, connectionStatus } = useRealtimeSubscriptions([
    {
      table: 'campaigns',
      event: 'UPDATE',
      filter
    }
  ]);

  const latestUpdate = Object.values(realtimeData)[0];

  return {
    campaignUpdate: latestUpdate?.new || null,
    previousData: latestUpdate?.old || null,
    isConnected,
    connectionStatus,
    hasUpdate: !!latestUpdate,
    updatedAt: latestUpdate?.timestamp
  };
}

/**
 * Hook for monitoring persona changes (useful for cross-agent notifications)
 * Nuclear migration: personas now in agent_outputs table
 */
export function usePersonaRealtime() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  const { realtimeData, isConnected } = useRealtimeSubscriptions([
    {
      table: 'agent_outputs',
      event: '*', // Monitor all persona changes
      filter: `org_id=eq.${orgId}:and:agent_type=eq.persona`
    }
  ]);

  return {
    realtimeData,
    isConnected,
    latestPersonaChange: Object.values(realtimeData)[0] || null
  };
}

/**
 * Hook for monitoring marketing strategy changes
 */
export function useMarketingStrategyRealtime() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  const { realtimeData, isConnected } = useRealtimeSubscriptions([
    {
      table: 'marketing_strategies',
      event: '*', // Monitor all strategy changes
      filter: `org_id=eq.${orgId}`
    }
  ]);

  return {
    realtimeData,
    isConnected,
    latestStrategyChange: Object.values(realtimeData)[0] || null
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

// Types are already exported above as interfaces