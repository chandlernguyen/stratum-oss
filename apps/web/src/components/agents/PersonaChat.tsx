import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgentChat } from './AgentChat';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { getLocalizedAgentPlaceholder } from '@/config/agentConfig';
import { buildAgentCampaignContext } from './campaignContext';

interface PersonaChatProps {
  onSaveAsPersona?: (personaData: any) => void;
  selectedSession?: any; // For loading chat history
  onSessionCreated?: (session: any, initialMessage?: any) => void; // Callback when a new session is created
  initialMessage?: string;
}

export function PersonaChat({ onSaveAsPersona, selectedSession, onSessionCreated, initialMessage }: PersonaChatProps) {
  const { t } = useTranslation(['agents']);
  const [lastPersonaGenerated, setLastPersonaGenerated] = useState<any>(null);
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { data: currentCampaign } = useCampaign(campaignId);


  // Function to detect if the message contains a persona
  // TODO: Re-enable when AgentChat supports onMessageReceived
  // const _detectPersonaInMessage = (message: string) => {
  //   // Simple detection based on keywords - you could make this more sophisticated
  //   const personaIndicators = [
  //     'Name:', 
  //     'Job Title:', 
  //     'Company:', 
  //     'Demographics:', 
  //     'Goals:', 
  //     'Pain Points:',
  //     'Background:'
  //   ];
  //   
  //   const hasPersonaContent = personaIndicators.some(indicator => 
  //     message.includes(indicator)
  //   );
  //   
  //   if (hasPersonaContent) {
  //     // Extract basic info from the message
  //     const extractField = (field: string) => {
  //       const regex = new RegExp(`${field}\\s*[:]?\\s*([^\\n]+)`, 'i');
  //       const match = message.match(regex);
  //       return match ? match[1].trim().replace(/[""]/g, '') : '';
  //     };
  //     
  //     return {
  //       name: extractField('Name'),
  //       title: extractField('Job Title') || extractField('Title'),
  //       company_name: extractField('Company'),
  //       detected: true
  //     };
  //   }
  //   
  //   return null;
  // };

  // const handleMessageReceived = (message: any) => {
  //   if (message.content) {
  //     const detectedPersona = detectPersonaInMessage(message.content);
  //     if (detectedPersona?.detected) {
  //       setLastPersonaGenerated(detectedPersona);
  //     }
  //   }
  // };



  // Build campaign context string for the agent
  const campaignContext = buildAgentCampaignContext(
    currentCampaign,
    "Please create personas that align with this campaign's target audience and objectives."
  );

  return (
    <div className="h-full flex flex-col">
      {/* Regular Chat */}
      <div className="flex-1">
        <AgentChat
          agentType="persona"
          agentName="Persona Agent"
          placeholder={getLocalizedAgentPlaceholder('persona')}
          agentColor="purple"
          contextInfo={campaignContext}
          selectedSession={selectedSession}
          onSessionCreated={onSessionCreated}
          initialMessage={initialMessage}
          // TODO: Add onMessageReceived when AgentChat supports it
          // onMessageReceived={handleMessageReceived}
        />
      </div>

      {/* Save as Persona Button - Shows when a persona is detected */}
      {lastPersonaGenerated && onSaveAsPersona && (
        <div className="p-4 border-t bg-gradient-to-r from-slate-50 to-amber-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Save className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium">
                {t('agents:personaChat.detected', { name: lastPersonaGenerated.name || 'Unnamed' })}
              </span>
            </div>
            <Button
              onClick={() => {
                onSaveAsPersona(lastPersonaGenerated);
                setLastPersonaGenerated(null);
              }}
              size="sm"
              className="bg-amber-600 hover:bg-slate-700"
            >
              {t('agents:personaChat.saveAsPersona')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
