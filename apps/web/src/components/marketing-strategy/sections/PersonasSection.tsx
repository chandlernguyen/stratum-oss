import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Users,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { PersonaCard } from '../PersonaCard';
import { PersonaFormModal } from '@/components/personas/PersonaFormModal';

interface PersonasSectionProps {
  personas: any[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function PersonasSection({ personas, isExpanded, onToggle }: PersonasSectionProps) {
  const { t } = useTranslation(['agents']);
  const [selectedPersona, setSelectedPersona] = useState<any>(null);

  const handlePersonaClick = (persona: any) => {
    setSelectedPersona(persona);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <Collapsible open={isExpanded} onOpenChange={onToggle}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-2 -m-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand-gold" />
                  <CardTitle className="text-lg">{t('agents:context.personas.title')}</CardTitle>
                  {personas.length > 0 && (
                    <Badge variant="outline">{personas.length}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {personas.length > 0 && (
                    <CheckCircle className="h-4 w-4 text-brand-success" />
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CardContent className="pt-3">
              {personas.length > 0 ? (
                <>
                  {/* Always visible - Show first 2 personas */}
                  <div className="space-y-2">
                    {personas.slice(0, 2).map((persona) => (
                      <div 
                        key={persona.id} 
                        onClick={() => handlePersonaClick(persona)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <PersonaCard persona={persona} variant="compact" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Expanded View - Show remaining personas */}
                  {personas.length > 2 && (
                    <CollapsibleContent>
                      <div className="space-y-2 mt-2">
                        {personas.slice(2).map((persona) => (
                          <div 
                            key={persona.id} 
                            onClick={() => handlePersonaClick(persona)}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                          >
                            <PersonaCard persona={persona} variant="compact" />
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  )}
                  
                  {/* Show expand hint if there are more than 2 personas */}
                  {personas.length > 2 && !isExpanded && (
                    <div className="text-xs text-muted-foreground pt-2 mt-2 border-t text-center">
                      {t('agents:context.personas.clickToSeeMore', { count: personas.length - 2 })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t('agents:context.personas.emptyState')}
                </div>
              )}
            </CardContent>
          </Collapsible>
        </CardHeader>
      </Card>

      {/* Persona Detail Modal - Using existing PersonaFormModal in read-only mode */}
      {selectedPersona && (
        <PersonaFormModal
          isOpen={!!selectedPersona}
          onClose={() => setSelectedPersona(null)}
          onSave={() => setSelectedPersona(null)}
          persona={selectedPersona}
        />
      )}
    </>
  );
}