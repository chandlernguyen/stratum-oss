import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  User,
  UserCheck,
  Star,
  MoreVertical,
  MessageSquare,
  Edit,
  Copy,
  Archive,
  Plus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Persona } from '@/hooks/data/usePersonas';
import { cn } from '@/lib/utils';

interface PersonaListViewProps {
  personas: Persona[];
  isLoading: boolean;
  selectedPersonaId?: string;
  onSelectPersona: (persona: Persona) => void;
  onEditPersona?: (persona: Persona) => void;
  onDuplicatePersona?: (personaId: string, currentName: string) => void;
  onArchivePersona?: (personaId: string) => void;
  onRestorePersona?: (personaId: string) => void;
  onCreatePersona?: () => void;
}

/**
 * Mobile-optimized list view for personas
 * - Full-width cards with touch-friendly targets
 * - Shows key persona info: name, title, company
 * - Actions menu for Interview, Edit, Duplicate, Archive
 * - Empty state for no personas
 */
export function PersonaListView({
  personas,
  isLoading,
  selectedPersonaId,
  onSelectPersona,
  onEditPersona,
  onDuplicatePersona,
  onArchivePersona,
  onRestorePersona,
  onCreatePersona,
}: PersonaListViewProps) {
  const { t } = useTranslation('personas');

  const getPersonaIcon = (persona: Persona) => {
    if (persona.is_primary) {
      return <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    return <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
  };

  const getIndustryColor = (industry?: string) => {
    const industryColors: Record<string, string> = {
      'Technology': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
      'Healthcare': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Finance': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
      'Retail': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'Manufacturing': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return industryColors[industry || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-3 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">{t('list.loading')}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (personas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <Users className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('list.empty')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          {t('list.emptyDescription')}
        </p>
        {onCreatePersona && (
          <Button
            onClick={onCreatePersona}
            className="bg-gradient-to-br from-slate-600 to-amber-600 hover:from-slate-700 hover:to-amber-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('list.createFirst')}
          </Button>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-3 p-3">
      {personas.map((persona) => (
        <Card
          key={persona.id}
          className={cn(
            "p-4 cursor-pointer transition-all duration-200 border-2 hover:shadow-lg active:scale-[0.98]",
            selectedPersonaId === persona.id
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700',
            persona.archived_at && 'opacity-60'
          )}
          onClick={() => onSelectPersona(persona)}
        >
          {/* Archived Badge */}
          {persona.archived_at && (
            <Badge
              variant="secondary"
              className="absolute top-3 right-12 text-xs px-2 py-0.5"
            >
              <Archive className="w-3 h-3 mr-1" />
              {t('list.archived')}
            </Badge>
          )}

          <div className="flex items-start justify-between gap-3">
            {/* Left: Icon + Content */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-1">
                {getPersonaIcon(persona)}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Name */}
                <p className="font-semibold text-base text-gray-900 dark:text-gray-100 break-words leading-snug">
                  {persona.name}
                </p>

                {/* Title */}
                <p className="text-sm text-gray-600 dark:text-gray-400 break-words leading-snug">
                  {persona.title}
                </p>

                {/* Company Name */}
                <p className="text-sm text-gray-600 dark:text-gray-400 break-words leading-snug">
                  {persona.company_name}
                </p>

                {/* Badges Row */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {/* Primary Badge */}
                  {persona.is_primary && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700">
                      <Star className="w-3 h-3 mr-1" />
                      {t('list.primary')}
                    </Badge>
                  )}

                  {/* Industry Badge */}
                  {persona.industry && (
                    <Badge className={cn("text-xs px-2 py-0.5", getIndustryColor(persona.industry))}>
                      {persona.industry}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPersona(persona);
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t('list.interview')}
                </DropdownMenuItem>
                {onEditPersona && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPersona(persona);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t('actions.edit')}
                  </DropdownMenuItem>
                )}
                {onDuplicatePersona && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePersona(persona.id, persona.name);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t('actions.duplicate')}
                  </DropdownMenuItem>
                )}
                {persona.archived_at ? (
                  onRestorePersona && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestorePersona(persona.id);
                      }}
                      className="text-green-600 dark:text-green-400"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      {t('list.restore')}
                    </DropdownMenuItem>
                  )
                ) : (
                  onArchivePersona && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchivePersona(persona.id);
                      }}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      {t('actions.archive')}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  );
}
