import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { User, Send } from 'lucide-react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';
import { getValidToken } from '@/lib/authService';
import { MessageRenderer } from './MessageRenderer';
import { InterviewInsightCapture } from '@/components/personas/InterviewInsightCapture';
import { useOrganization } from '@/hooks/data/useOrganization';

interface PersonaInterviewChatProps {
  persona: any;
  sessionId?: string;
  activeTab?: string;
}

export function PersonaInterviewChat({
  persona,
  sessionId,
  activeTab = 'interview'
}: PersonaInterviewChatProps) {
  const { t } = useTranslation(['agents']);
  const [interviewMessages, setInterviewMessages] = useState<any[]>([]);
  const [interviewInput, setInterviewInput] = useState('');
  const [isInterviewLoading, setIsInterviewLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { organization } = useOrganization();

  // Generate session ID only once and store in ref to prevent recreation on every render
  const interviewSessionIdRef = useRef<string>(sessionId || crypto.randomUUID());
  const interviewSessionId = interviewSessionIdRef.current;

  const handleInterviewSend = async () => {
    if (!interviewInput.trim() || !persona || !persona.id) return;

    const currentInput = interviewInput; // Capture current value
    const userMessage = {
      role: 'user',
      content: currentInput,
      timestamp: new Date().toISOString()
    };

    setInterviewMessages(prev => [...prev, userMessage]);
    setInterviewInput('');
    setIsInterviewLoading(true);

    // Create streaming AI response placeholder
    const aiMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    setInterviewMessages(prev => [...prev, aiMessage]);

    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;

    try {
      const token = await getValidToken();
      const headers = getLocaleHeaders();
      headers['Content-Type'] = 'application/json';
      headers.Authorization = `Bearer ${token}`;

      await fetchEventSource(`${API_BASE_URL}/api/v1/personas/${persona.id}/interview-stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: currentInput,
          session_id: interviewSessionId
        }),
        signal: ctrl.signal,
        onmessage(event) {
          if (event.event === 'text_chunk') {
            const parsed = JSON.parse(event.data);
            setInterviewMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + parsed.token
              };
              return updated;
            });
          } else if (event.event === 'stream_end') {
            setIsInterviewLoading(false);
          }
        },
        onerror(err) {
          console.error('Interview stream error:', err);
          setIsInterviewLoading(false);
        }
      });
    } catch (error) {
      console.error('Interview error:', error);
      setIsInterviewLoading(false);
    }
  };

  // Build conversation text for insight capture - memoized to prevent infinite loops
  const conversationText = useMemo(() => {
    return interviewMessages
      .map(msg => `${msg.role === 'user' ? 'Interviewer' : persona.name}: ${msg.content}`)
      .join('\n\n');
  }, [interviewMessages, persona.name]);

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Main Interview Chat - Show on desktop always, on mobile only when activeTab is 'interview' */}
      <div className={`flex-1 flex flex-col min-w-0 ${activeTab === 'interview' ? '' : 'hidden md:flex'}`}>
        {/* Interview Mode Header - Responsive */}
        <div className="bg-gradient-to-r from-slate-50 to-amber-50 dark:from-gray-800 dark:to-gray-700 p-3 md:p-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className="p-1.5 md:p-2 rounded-lg bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                <User className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base md:text-lg truncate">{persona.name}</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                  {persona.title} at {persona.company_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <Badge className="bg-slate-100 text-slate-700 text-xs px-1.5 md:px-2 hidden sm:inline-flex">
                {t('agents:interview.mode')}
              </Badge>
              <Badge
                className="text-xs px-1.5 md:px-2"
                variant={
                  persona.customer_status === 'active' ? 'success' :
                  persona.customer_status === 'churned' ? 'destructive' :
                  'secondary'
                }
              >
                {persona.customer_status || 'prospect'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Interview Messages */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4">
          {interviewMessages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl w-full md:w-auto p-2.5 md:p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-slate-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}>
                <div className="flex items-start gap-2">
                  {msg.role === 'assistant' && (
                    <User className="w-5 h-5 text-amber-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    {msg.role === 'assistant' && (
                      <p className="font-medium text-sm text-amber-600 mb-1">{persona.name}</p>
                    )}
                    {msg.role === 'assistant' ? (
                      <MessageRenderer
                        message={{
                          id: `${index}`,
                          role: 'assistant',
                          content: msg.content,
                          timestamp: msg.timestamp || new Date().toISOString()
                        }}
                        isStreaming={false}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isInterviewLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-500">{t('agents:interview.thinking')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Interview Input */}
        <div className="p-2 md:p-4 border-t bg-white dark:bg-gray-900">
          <div className="flex gap-2">
            <Textarea
              value={interviewInput}
              onChange={(e) => setInterviewInput(e.target.value)}
              placeholder={t('agents:interview.placeholder', { name: persona.name })}
              className="flex-1 resize-none text-sm md:text-base"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleInterviewSend();
                }
              }}
            />
            <Button
              onClick={handleInterviewSend}
              disabled={!interviewInput.trim() || isInterviewLoading}
              className="bg-amber-600 hover:bg-slate-700 h-auto px-3 md:px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Insight Capture Panel - Show on desktop always, on mobile only when activeTab is 'insights' */}
      {organization && (
        <div className={`flex-1 md:w-96 md:flex-initial border-l bg-gray-50 dark:bg-gray-900 p-3 md:p-4 overflow-y-auto ${activeTab === 'insights' ? '' : 'hidden md:block'}`}>
          <InterviewInsightCapture
            persona={persona}
            conversation={conversationText}
            sessionId={interviewSessionId}
            orgId={organization.id}
          />
        </div>
      )}
    </div>
  );
}
