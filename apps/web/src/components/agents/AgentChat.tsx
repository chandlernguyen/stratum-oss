import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from 'react-router-dom';
import type { AgentMessage } from "@/types/agentTools";
import { getLocalizedAgentIdentity, getHintsForLevel, type ExpertiseLevel } from '@/config/agentConfig';
import { useExpertMode } from '@/components/settings/ExpertModeToggle';
import { useAuthStore } from '@/stores/auth';
import { useCrossAgentContext } from '@/hooks/useCrossAgentContext';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { api, API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useClientContext } from '@/contexts/ClientContext';
import type { UploadedFile } from './FileUploadButton';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput, agentSupportsFileUpload } from './ChatInput';

// Agent types matching backend (updated Oct 2025)
export type AgentType =
  | 'strategy'
  | 'persona'
  | 'marketing_strategy'
  | 'content'
  | 'campaign_planning'
  | 'competitive_intelligence'
  | 'client_success'
  | 'performance_intelligence'  // Replaces analytics, roi_budget, quick_wins
  | 'quick_start';

// Module-level state to track active SSE streams across component remounts
// This is necessary because React Router remounts components when URL path changes
// (e.g., /quick-start to /quick-start/session/xyz are different routes)
// Key format: `${agentType}-${sessionId}`
const activeStreams = new Map<string, {
  sessionId: string;
  abortController: AbortController;
  preserveOnUnmount: boolean; // If true, don't abort when component unmounts
  messages: AgentMessage[]; // Store messages so remounted component can restore them
  isLoading: boolean; // Track loading state for the stream
}>();

// Helper to get stream key
const getStreamKey = (agentType: string, sessionId: string) => `${agentType}-${sessionId}`;

interface AgentChatProps {
  agentType: AgentType;
  agentName: string;
  mode?: string; // Optional mode for agents with mode-based routing (e.g., marketing_strategy)
  placeholder?: string;
  agentColor?: string;
  selectedSession?: any;
  onSessionCreated?: (session: any, initialMessage: any) => void;
  contextInfo?: string; // Additional context to include in messages
  initialMessage?: string; // Optional initial message to send
  disableInitialScroll?: boolean; // Prevent auto-scroll on initial page load
}

// Removed: getAuthToken helper - now using centralized auth service

export function AgentChat({
  agentType,
  agentName,
  mode,
  placeholder,
  agentColor = 'blue',
  selectedSession,
  onSessionCreated,
  contextInfo,
  initialMessage,
  disableInitialScroll = false
}: AgentChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(selectedSession?.id || null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const connectionStateRef = useRef<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const isExpertMode = useExpertMode();
  const [expertiseLevel, setExpertiseLevel] = useState<ExpertiseLevel>(isExpertMode ? 'expert' : 'beginner');
  const { user } = useAuthStore();
  const location = useLocation();

  // Track if we're in the middle of creating a session to prevent race conditions
  const isCreatingSessionRef = useRef(false);
  const pendingMessagesRef = useRef<AgentMessage[]>([]);
  // Track the session ID that the active SSE stream belongs to - prevents abort during navigation
  const activeStreamSessionIdRef = useRef<string | null>(null);

  // Get cross-agent context if available
  const { hasContext, context, suggestedPrompt, fromAgent, clearContext } = useCrossAgentContext();

  // Get client context if available (for agency users in client-scoped routes)
  const { clientId } = useClientContext(); // Get client context from provider

  // Auto-save hook
  const { saveStatus, outputId, finalizeOutput, checkForAutoSave } = useAutoSave();
  const [contextUsed, setContextUsed] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Use helper function from ChatInput
  const supportsFileUpload = agentSupportsFileUpload(agentType);

  // File handlers
  const handleFileUploaded = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);
  };

  const handleFileRemoved = (geminiUri: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.gemini_uri !== geminiUri));
  };


  // ADDED: Handle initial message passed via navigation state
  useEffect(() => {
    const initialMessageFromState = location.state?.initialMessage as AgentMessage | undefined;
    if (initialMessageFromState && messages.length <= 1) { // Only run if chat is empty or has just the greeting
      // Replace greeting with the actual first message
      setMessages([initialMessageFromState]);
    }
  }, [location.state]);

  // Get user identity for org-specific hints
  const { data: identity } = useUserIdentity();
  const orgType = identity?.organization?.type;

  // Get agent identity and hints (with org-specific labels and localization)
  const agentIdentity = getLocalizedAgentIdentity(agentType);
  const hints = getHintsForLevel(agentType, expertiseLevel, orgType);

  // Pre-fill input with suggested prompt from context
  useEffect(() => {
    if (hasContext && suggestedPrompt && !contextUsed && input === '') {
      setInput(suggestedPrompt);
      setContextUsed(true);
    }
  }, [hasContext, suggestedPrompt, contextUsed, input]);

  // Pre-fill input with initial message from framework selection
  useEffect(() => {
    if (initialMessage && !initialMessageSent && input === '') {
      console.log('[AgentChat] Pre-filling input with initial message:', initialMessage.substring(0, 100));
      setInput(initialMessage);
      setInitialMessageSent(true);
    }
  }, [initialMessage, initialMessageSent, input]);

  // Handle session changes and load messages
  useEffect(() => {
    console.log('[AgentChat] useEffect triggered - selectedSession:', selectedSession?.id,
      'isCreatingSession:', isCreatingSessionRef.current,
      'activeStreamSession:', activeStreamSessionIdRef.current,
      'currentSessionId:', sessionId);

    // Don't reset if we're in the middle of creating a session
    if (isCreatingSessionRef.current) {
      console.log('[AgentChat] Skipping - session creation in progress');
      return;
    }

    // CRITICAL FIX: Check module-level state for an active stream for this session
    // This handles the case where the component remounted during streaming
    const streamKey = selectedSession?.id ? getStreamKey(agentType, selectedSession.id) : null;
    const existingStream = streamKey ? activeStreams.get(streamKey) : null;

    if (existingStream) {
      console.log('[AgentChat] Found existing stream in module-level state:', streamKey,
        'messages:', existingStream.messages.length, 'isLoading:', existingStream.isLoading);

      // Restore state from the existing stream
      setSessionId(selectedSession.id);
      setMessages(existingStream.messages);
      setIsLoading(existingStream.isLoading);
      abortControllerRef.current = existingStream.abortController;
      activeStreamSessionIdRef.current = selectedSession.id;
      connectionStateRef.current = existingStream.isLoading ? 'connected' : 'idle';

      // Clear pending messages since we restored from module-level state
      pendingMessagesRef.current = [];

      // CRITICAL: If stream is still loading, start polling for updates
      // This ensures the remounted component receives streaming updates
      if (existingStream.isLoading && streamKey) {
        const capturedStreamKey = streamKey; // Capture for closure
        const pollInterval = setInterval(() => {
          const currentStream = activeStreams.get(capturedStreamKey);
          if (currentStream) {
            // Sync messages from module-level state
            setMessages(currentStream.messages);
            setIsLoading(currentStream.isLoading);

            // Stop polling when stream completes
            if (!currentStream.isLoading) {
              console.log('[AgentChat] Stream completed during poll, doing final sync');
              // Do one final sync to ensure we have the complete messages
              setMessages([...currentStream.messages]);
              setIsLoading(false);
              clearInterval(pollInterval);
            }
          } else {
            // Stream was cleaned up - load messages from API as fallback
            console.log('[AgentChat] Stream no longer exists, loading from API');
            clearInterval(pollInterval);
            setIsLoading(false);
            // Load final messages from database
            if (selectedSession?.id) {
              loadSessionMessages(selectedSession.id);
            }
          }
        }, 100); // Poll every 100ms for responsive updates

        // Cleanup interval on next effect run or unmount
        return () => {
          clearInterval(pollInterval);
        };
      }
      return;
    }

    // CRITICAL FIX: Don't abort if the new session matches the active stream's session
    // This prevents aborting during the navigation that happens after session creation
    const isSameSessionAsActiveStream = selectedSession?.id &&
      activeStreamSessionIdRef.current === selectedSession.id;

    // Also check if the selected session matches our current internal sessionId
    // This handles the case where navigation happens before activeStreamSessionIdRef is set
    const isOurNewlyCreatedSession = selectedSession?.id && sessionId === selectedSession.id;

    console.log('[AgentChat] isSameSessionAsActiveStream:', isSameSessionAsActiveStream,
      'isOurNewlyCreatedSession:', isOurNewlyCreatedSession,
      'hasAbortController:', !!abortControllerRef.current);

    // Only abort if we're actually switching to a DIFFERENT session
    // (not the session that our active stream is already using or that we just created)
    if (!isSameSessionAsActiveStream && !isOurNewlyCreatedSession && abortControllerRef.current) {
      console.log('[AgentChat] Aborting connection - switching from session',
        activeStreamSessionIdRef.current, 'to', selectedSession?.id);
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      activeStreamSessionIdRef.current = null;

      // Only reset state when actually switching sessions
      connectionStateRef.current = 'idle';
      setIsLoading(false);
      setError(null);
      setRetryCount(0);
    }

    if (selectedSession) {
      // Load messages for selected session
      setSessionId(selectedSession.id);

      // If we have pending messages from session creation, restore them
      if (pendingMessagesRef.current.length > 0) {
        console.log('[AgentChat] Restoring pending messages');
        setMessages(pendingMessagesRef.current);
        pendingMessagesRef.current = [];
      } else if (!isSameSessionAsActiveStream && !isOurNewlyCreatedSession) {
        // Only load messages if this isn't our active stream's session
        // (we already have the messages in state)
        console.log('[AgentChat] Loading messages for different session');
        loadSessionMessages(selectedSession.id);
      } else {
        // IMPORTANT: Even if this is our newly created session, we need to load messages
        // if the component remounted and lost state (messages array is empty or just greeting)
        // Check using a timeout to allow state to settle after remount
        setTimeout(() => {
          // Access current messages via a callback to get latest state
          setMessages(currentMessages => {
            const hasOnlyGreeting = currentMessages.length === 0 ||
              (currentMessages.length === 1 && currentMessages[0].id === 'greeting');

            if (hasOnlyGreeting && selectedSession?.id) {
              console.log('[AgentChat] Component remounted with empty state - loading messages from API');
              loadSessionMessages(selectedSession.id);
            } else {
              console.log('[AgentChat] Skipping message load - same session, have messages');
            }
            return currentMessages; // Don't modify
          });
        }, 100);
      }
    } else {
      // Show greeting message for new session
      setSessionId(null);
      const greetingMessage: AgentMessage = {
        id: 'greeting',
        role: 'assistant',
        content: agentIdentity.greeting,
        timestamp: new Date().toISOString(),
      };
      setMessages([greetingMessage]);
    }
  }, [selectedSession?.id, agentType]);

  // Handle initial message from navigation state
  useEffect(() => {
    const initialMessageFromState = location.state?.initialMessage;
    if (initialMessageFromState && messages.length === 0) {
      console.log('[AgentChat] Found initial message in navigation state:', initialMessageFromState);
      // Set the initial message from navigation state
      setMessages([initialMessageFromState]);
      // Clear the state to prevent re-applying on future navigations
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Store handleSendMessage ref for initial message (kept for potential future use)
  const handleSendMessageRef = useRef<((msg: string) => void) | null>(null);

  // Cleanup on unmount - but preserve active streams during navigation
  useEffect(() => {
    // Capture agentType in closure for cleanup
    const currentAgentType = agentType;

    return () => {
      // Check if there's an active stream that should be preserved
      const activeSessionId = activeStreamSessionIdRef.current;
      if (activeSessionId) {
        const streamKey = getStreamKey(currentAgentType, activeSessionId);
        const stream = activeStreams.get(streamKey);

        if (stream?.preserveOnUnmount) {
          // Don't abort - stream will be reconnected when component remounts
          console.log('[AgentChat] Preserving stream on unmount:', streamKey);
          return;
        }
      }

      // No stream to preserve - clean up normally
      if (abortControllerRef.current) {
        console.log('[AgentChat] Aborting on unmount (no preserve flag)');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      connectionStateRef.current = 'idle';
      activeStreamSessionIdRef.current = null;
    };
  }, [agentType]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await api.get(`/api/v1/direct-agents/${agentType}/sessions/${sessionId}/messages`);
      const sessionMessages = response.data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.created_at,
        structured_data: msg.structured_data
      }));
      setMessages(sessionMessages.length > 0 ? sessionMessages : [
        {
          id: 'greeting',
          role: 'assistant',
          content: agentIdentity.greeting,
          timestamp: new Date().toISOString(),
        }
      ]);
    } catch (error) {
      console.error('Failed to load session messages:', error);
      // Show greeting if loading fails
      const greetingMessage: AgentMessage = {
        id: 'greeting',
        role: 'assistant',
        content: agentIdentity.greeting,
        timestamp: new Date().toISOString(),
      };
      setMessages([greetingMessage]);
    }
  };

  const createNewSession = async () => {
    const response = await api.post('/api/v1/direct-agents/sessions', {
      agent_type: agentType,
      ...(mode && { mode }),  // Include mode for agents with mode-based routing
      ...(clientId && { client_id: clientId }) // Include client_id if in client context (agency users)
    });
    return response.data.session_id;
  };

  

  // Enhanced SSE connection with retry logic based on Gemini API best practices
  const connectWithRetry = async (currentSessionId: string, currentInput: string, retryAttempt: number = 0): Promise<void> => {
    const MAX_RETRIES = 2; // Google Gemini API recommendation
    const RETRY_DELAYS = [1000, 3000]; // Exponential backoff: 1s, 3s

    if (retryAttempt > MAX_RETRIES) {
      throw new Error(`Failed to connect after ${MAX_RETRIES + 1} attempts. Please check your connection and try again.`);
    }

    // Get current session and token
    if (!user?.id) throw new Error("User ID not found. Please log in again.");
    const { session } = useAuthStore.getState();
    const token = session?.access_token;

    // Abort any existing connection before creating new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;
    connectionStateRef.current = 'connecting';
    // Track which session this stream belongs to - prevents abort during navigation
    activeStreamSessionIdRef.current = currentSessionId;

    // Store in module-level activeStreams map so it survives component remounts
    // This is critical for preventing abort during React Router navigation
    const streamKey = getStreamKey(agentType, currentSessionId);

    // Helper to update module-level stream state with current messages
    const updateStreamMessages = (newMessages: AgentMessage[]) => {
      const stream = activeStreams.get(streamKey);
      if (stream) {
        stream.messages = [...newMessages]; // Create a copy to avoid reference issues
      }
    };

    // Get current messages to include in stream state (user message + streaming response)
    // This ensures remounted components can restore the full conversation
    const currentMessages = pendingMessagesRef.current.length > 0
      ? pendingMessagesRef.current
      : messages;

    activeStreams.set(streamKey, {
      sessionId: currentSessionId,
      abortController: ctrl,
      preserveOnUnmount: true, // Will be set to false after stream completes
      messages: [...currentMessages], // Initialize with current messages including user's message
      isLoading: true,
    });
    console.log('[AgentChat] Registered active stream:', streamKey, 'with', currentMessages.length, 'initial messages');

    let structuredData: any = null;

    try {
      const headers = getLocaleHeaders();
      headers['Content-Type'] = 'application/json';
      headers.Authorization = `Bearer ${token}`;

      await fetchEventSource(`${API_BASE_URL}/api/v1/direct-agents/${agentType}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: currentSessionId,
          message: contextInfo ? `${contextInfo}\n\nUser Query: ${currentInput}` : currentInput,
          user_id: user.id,
          agent_type: agentType,
          ...(clientId && { client_id: clientId }), // Include client_id for agency users in client context
          file_info: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        }),
        signal: ctrl.signal,
        async onopen(response: Response) {
          if (response.ok && response.status === 200) {
            connectionStateRef.current = 'connected';
            setRetryCount(0); // Reset retry count on successful connection
          } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            // Client errors (except rate limiting) - don't retry
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          } else {
            // Server errors or rate limiting - will be handled in onerror
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        },
        onmessage(event: any) {
          // Ensure we're not aborting mid-stream
          if (connectionStateRef.current !== 'connected') {
            return;
          }
          
          if (event.event === 'text_chunk') {
            const parsed = JSON.parse(event.data);
            setMessages(prev => {
              const updatedMessages = prev.map(msg =>
                msg.id === 'streaming-response'
                  ? {
                      ...msg,
                      // Replace optimistic text with real content on first chunk
                      content: msg.isOptimistic ? parsed.token : msg.content + parsed.token,
                      isOptimistic: false
                    }
                  : msg
              );
              // CRITICAL: Sync to module-level state for remount restoration
              updateStreamMessages(updatedMessages);
              return updatedMessages;
            });
          } else if (event.event === 'tool_result') {
            structuredData = JSON.parse(event.data);
          } else if (event.event === 'stream_end') {
            // CRITICAL: Update module-level state FIRST, THEN set isLoading = false
            // This prevents race condition where polling reads isLoading=false before messages are updated
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];

              // Detect empty streaming response (indicates backend error)
              if (lastMsg?.id === 'streaming-response' && (!lastMsg.content || lastMsg.content.trim() === '')) {
                console.error('[AgentChat] Empty response detected, removing placeholder message');
                setError('Failed to generate response. Please try again.');
                // Remove the empty streaming message
                const errorMessages = prev.filter(msg => msg.id !== 'streaming-response');
                // Sync error state to module-level BEFORE setting isLoading=false
                const stream = activeStreams.get(streamKey);
                if (stream) {
                  stream.messages = [...errorMessages];
                  stream.isLoading = false; // Set AFTER messages are updated
                }
                return errorMessages;
              }

              // Normal case: finalize the message
              const finalMessages = prev.map(msg =>
                msg.id === 'streaming-response'
                  ? {
                      ...msg,
                      id: new Date().toISOString(),
                      structured_data: structuredData
                    }
                  : msg
              );
              // CRITICAL: Update module-level messages AND isLoading atomically
              // This ensures polling reads complete messages when it sees isLoading=false
              const stream = activeStreams.get(streamKey);
              if (stream) {
                stream.messages = [...finalMessages];
                stream.isLoading = false; // Set AFTER messages are updated
              }
              return finalMessages;
            });
            connectionStateRef.current = 'idle';
            activeStreamSessionIdRef.current = null; // Clear active stream tracking

            // Delay cleanup slightly to allow any in-flight remounts to restore
            setTimeout(() => {
              activeStreams.delete(streamKey);
              console.log('[AgentChat] Stream completed, removed from activeStreams:', streamKey);
            }, 500);

            setIsLoading(false);

            // Check for auto-save after stream ends
            if (sessionId) {
              setTimeout(() => {
                checkForAutoSave(sessionId);
              }, 2000); // Delay to allow backend auto-save to complete
            }

            // Clear uploaded files after successful send - document is now part of conversation history
            if (uploadedFiles.length > 0) {
              setUploadedFiles([]);
            }

            ctrl.abort(); // Clean connection termination
          } else if (event.event === 'auto_save') {
            // Handle auto-save status updates from backend
            const parsed = JSON.parse(event.data);
            window.dispatchEvent(new CustomEvent('autoSave', {
              detail: {
                status: parsed.status,
                outputId: parsed.output_id,
                output: parsed.output
              }
            }));
          } else if (event.event === 'error') {
            const parsed = JSON.parse(event.data);
            throw new Error(parsed.message || 'Stream error occurred');
          }
        },
        onerror(err: any) {
          console.error(`SSE connection error (attempt ${retryAttempt + 1}):`, err);
          connectionStateRef.current = 'error';
          activeStreamSessionIdRef.current = null; // Clear active stream tracking on error
          activeStreams.delete(streamKey); // Clean up module-level tracking
          
          // Check if this is a retryable error
          const isRetryableError = (
            err.message?.includes('429') || // Rate limit
            err.message?.includes('503') || // Service unavailable  
            err.message?.includes('500') || // Server error
            err.message?.includes('Network') || // Network issues
            err.message?.includes('fetch')
          );
          
          if (isRetryableError && retryAttempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[retryAttempt] || 3000;
            console.log(`Retrying SSE connection in ${delay}ms... (attempt ${retryAttempt + 1}/${MAX_RETRIES})`);
            setRetryCount(retryAttempt + 1);
            
            setTimeout(() => {
              connectWithRetry(currentSessionId, currentInput, retryAttempt + 1).catch((retryErr) => {
                console.error('Retry failed:', retryErr);
                setError(retryErr.message || 'Connection failed after multiple attempts.');
                setIsLoading(false);
                setMessages(prev => prev.filter(msg => msg.id !== 'streaming-response'));
              });
            }, delay);
            
            return; // Don't throw here, let retry handle it
          }
          
          // Final error after retries exhausted or non-retryable error
          throw err;
        }
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Connection was intentionally aborted (e.g., user navigated away)
        return;
      }
      
      // Re-throw for final error handling
      throw err;
    }
  };

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading || connectionStateRef.current === 'connecting') return;

    setError(null);
    setRetryCount(0);
    
    const userMessage: AgentMessage = {
      id: new Date().toISOString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    const currentInput = messageText;
    // Only clear input after we know the message will be sent
    // This prevents loss of message during session creation/navigation
    setIsLoading(true);

    // Declare currentSessionId outside try block so it's accessible in catch
    let currentSessionId: string | null = sessionId;

    try {
      // Create session if needed
      console.log('[AgentChat] Current sessionId:', sessionId, 'Creating new?', !currentSessionId);
      if (!currentSessionId) {
        // Mark that we're creating a session to prevent race conditions
        isCreatingSessionRef.current = true;
        
        console.log('[AgentChat] Creating new session...');
        currentSessionId = await createNewSession();
        console.log('[AgentChat] New session created:', currentSessionId);
        setSessionId(currentSessionId);
        // Set the active stream session ID EARLY - before any async operations
        // This ensures the useEffect won't abort our connection during navigation
        activeStreamSessionIdRef.current = currentSessionId;
        // Now it's safe to clear the input since session is created
        setInput('');
        
        // Store messages in ref to preserve them through re-render
        // Optimistic acknowledgement: show instant feedback before first real chunk
        const messagesWithResponse = [
          ...messages,
          userMessage,
          {
            id: 'streaming-response',
            role: 'assistant' as const,
            content: '✨ Analyzing your request...',
            timestamp: new Date().toISOString(),
            isOptimistic: true
          }
        ];
        pendingMessagesRef.current = messagesWithResponse;
        setMessages(messagesWithResponse);
        
        // Notify parent component about new session
        if (onSessionCreated) {
          // Generate appropriate session title based on agent type
          const sessionTitles: Record<string, string> = {
            strategy: 'Strategy Analysis',
            content: 'Content Creation',
            persona: 'Persona Development',
            marketing_strategy: 'Marketing Strategy',
            analytics: 'Analytics Session',
            roi_budget: 'ROI & Budget Analysis',
            campaign_planning: 'Campaign Execution',
            quick_wins: 'Quick Wins',
            competitive_intelligence: 'Competitive Analysis',
            client_success: 'Client Success',
            quick_start: 'Quick Start Intelligence'
          };
          
          const newSession = {
            id: currentSessionId,
            agent_type: agentType,  // Include agent_type for cross-agent routing
            mode: mode,  // Include mode for marketing_strategy routing
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            session_title: sessionTitles[agentType] || `${agentName} Session`,
            message_count: 0,
            first_message: currentInput
          };
          // Defer parent update until after SSE connection is established
          // This prevents the re-render from interrupting the stream
          requestAnimationFrame(() => {
            console.log('[AgentChat] Calling onSessionCreated with session and initial message');
            onSessionCreated(newSession, userMessage);
            // Keep the flag true a bit longer to ensure useEffect doesn't run
            setTimeout(() => {
              isCreatingSessionRef.current = false;
            }, 100);
          });
        } else {
          isCreatingSessionRef.current = false;
        }
      } else {
        // Not creating a new session, just add messages normally
        setInput(''); // Safe to clear input when we have an existing session
        // Optimistic acknowledgement: show instant feedback before first real chunk
        setMessages(prev => [
          ...prev,
          userMessage,
          {
            id: 'streaming-response',
            role: 'assistant' as const,
            content: '✨ Analyzing your request...',
            timestamp: new Date().toISOString(),
            isOptimistic: true
          }
        ]);
      }

      // Use enhanced connection with retry logic
      await connectWithRetry(currentSessionId || '', currentInput);

    } catch (err: any) {
      console.error('Final SSE error:', err);
      setError(err.message || `Failed to get response from ${agentName}. Please try again.`);
      setMessages(prev => prev.filter(msg => msg.id !== 'streaming-response'));
      setIsLoading(false);
      connectionStateRef.current = 'idle';
      // Clean up module-level tracking if we have a session ID
      if (currentSessionId) {
        activeStreams.delete(getStreamKey(agentType, currentSessionId));
      }
      activeStreamSessionIdRef.current = null;
    }
  }, [isLoading, agentName, sessionId, onSessionCreated, messages, user, agentType, contextInfo, uploadedFiles]);

  // Store ref to handleSendMessage for initial message
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || connectionStateRef.current === 'connecting') return;
    
    await handleSendMessage(input);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950 rounded-xl md:rounded-xl">
      {/* Message List - uses extracted component */}
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        error={error}
        retryCount={retryCount}
        sessionId={sessionId}
        agentType={agentType}
        agentColor={agentColor}
        disableInitialScroll={disableInitialScroll}
        saveStatus={saveStatus}
        outputId={outputId}
        onFinalize={finalizeOutput}
        hasContext={hasContext}
        fromAgent={fromAgent ?? undefined}
        context={context}
        contextUsed={contextUsed}
        onClearContext={clearContext}
        onClearInput={() => setInput('')}
        onSetContextUsed={setContextUsed}
      />

      {/* Input Section - uses extracted component */}
      <ChatInput
        agentType={agentType}
        placeholder={placeholder || agentIdentity.description}
        isLoading={isLoading}
        isConnecting={connectionStateRef.current === 'connecting'}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        uploadedFiles={uploadedFiles}
        onFileUploaded={handleFileUploaded}
        onFileRemoved={handleFileRemoved}
        supportsFileUpload={supportsFileUpload}
        hints={hints}
        expertiseLevel={expertiseLevel}
        onExpertiseLevelChange={setExpertiseLevel}
      />
    </div>
  );
}
