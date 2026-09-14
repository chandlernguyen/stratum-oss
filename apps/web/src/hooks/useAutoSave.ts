import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './data/useUserIdentity';

interface AutoSaveOutput {
  id: string;
  agent_type: string;
  status: 'draft' | 'final';
  validation_status: string;
  title: string;
  created_at: string;
}

interface UseAutoSaveReturn {
  saveStatus: 'saving' | 'saved' | 'error' | null;
  outputId: string | null;
  output: AutoSaveOutput | null;
  finalizeOutput: (outputId: string) => Promise<void>;
  checkForAutoSave: (sessionId: string) => Promise<void>;
}

export function useAutoSave(): UseAutoSaveReturn {
  // Database-First: Get org context
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [outputId, setOutputId] = useState<string | null>(null);
  const [output, setOutput] = useState<AutoSaveOutput | null>(null);

  const checkForAutoSave = useCallback(async (sessionId: string) => {
    if (!orgId || !sessionId) return;

    try {
      // Database-First: Check for auto-saved output for this session
      const { data, error } = await supabase
        .from('agent_outputs')
        .select('id, agent_type, status, validation_status, title, created_at')
        .eq('org_id', orgId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const latestOutput = data[0] as AutoSaveOutput;
        setOutput(latestOutput);
        setOutputId(latestOutput.id);
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('[useAutoSave] Failed to check for auto-save:', error);
    }
  }, [orgId]);

  const finalizeOutput = useCallback(async (outputId: string) => {
    if (!orgId) {
      throw new Error('Organization not found');
    }

    // Database-First: Update status from draft to final
    const { data, error } = await supabase
      .from('agent_outputs')
      .update({
        status: 'final',
        updated_at: new Date().toISOString()
      })
      .eq('id', outputId)
      .eq('org_id', orgId) // Security: explicit org check
      .select('id, agent_type, status, validation_status, title, created_at')
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to finalize output');
    }

    if (data) {
      setOutput(data as AutoSaveOutput);
    }
  }, [orgId]);

  // Listen for SSE events that indicate auto-save
  useEffect(() => {
    const handleAutoSaveEvent = (event: CustomEvent) => {
      const { status, outputId: savedOutputId, output: savedOutput } = event.detail;

      if (status === 'saving') {
        setSaveStatus('saving');
      } else if (status === 'saved' && savedOutputId) {
        setOutputId(savedOutputId);
        setOutput(savedOutput);
        setSaveStatus('saved');
      } else if (status === 'error') {
        setSaveStatus('error');
      }
    };

    window.addEventListener('autoSave', handleAutoSaveEvent as EventListener);

    return () => {
      window.removeEventListener('autoSave', handleAutoSaveEvent as EventListener);
    };
  }, []);

  return {
    saveStatus,
    outputId,
    output,
    finalizeOutput,
    checkForAutoSave
  };
}