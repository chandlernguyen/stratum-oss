import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Users, Briefcase, Target, AlertCircle, Brain, Layers, MessageSquare, FileText, Clock, MapPin, Building } from 'lucide-react'
import { renderContent } from '../shared/ViewerUtils'
import { GenericViewer } from './GenericViewer'

interface PersonaViewerProps {
  content: any
  hasStructuredData: boolean
}

export function PersonaViewer({ content, hasStructuredData }: PersonaViewerProps) {
  // Handle empty or invalid content
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No persona data available</p>
      </div>
    )
  }

  // Handle string content (raw text response)
  if (typeof content === 'string') {
    return (
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    )
  }

  // Check if content is an array (multiple personas)
  if (Array.isArray(content)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg dark:bg-amber-950/20 dark:text-amber-400">
          <Users className="w-4 h-4" />
          Viewing {content.length} Customer Persona{content.length > 1 ? 's' : ''}
        </div>

        <Tabs defaultValue="persona-0" className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(content.length, 4)}, 1fr)` }}>
            {content.map((persona, index) => (
              <TabsTrigger key={persona.id || index} value={`persona-${index}`} className="truncate">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="truncate max-w-[150px]">
                    {persona._persona_title || persona.name || `Persona ${index + 1}`}
                  </span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {content.map((persona, index) => (
            <TabsContent key={persona.id || index} value={`persona-${index}`} className="mt-6">
              <PersonaSingleViewer content={persona} hasStructuredData={hasStructuredData} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  // Single persona view
  return <PersonaSingleViewer content={content} hasStructuredData={hasStructuredData} />
}

// Extract single persona rendering into a separate component
function PersonaSingleViewer({ content, hasStructuredData }: PersonaViewerProps) {

  // Check if this is the direct format (with demographics, goals, etc. at top level)
  const isDirectFormat = content.demographics || content.goals || content.pain_points ||
                         content.jobs_to_be_done || content.decision_criteria;

  // Extract data based on format
  let personaDetails, behavioralData, engagementPreferences, locationInfo;

  if (isDirectFormat) {
    // Direct format - the most common case from actual agent outputs
    personaDetails = {
      name: content.name || 'Unnamed Persona',
      role: content.title || content.role,
      demographics: content.demographics,
      company_details: content.company_name || content.company_details,
      industry: content.industry
    };

    // Handle location - primarily string in DB, but could be object from AI
    locationInfo = content.location;

    behavioralData = {
      goals: content.goals,
      pain_points: content.pain_points,
      jobs_to_be_done: content.jobs_to_be_done,
      motivations: content.motivations,
      decision_criteria: content.decision_criteria,
      objections: content.objections
    };
    engagementPreferences = {
      preferred_channels: content.preferred_channels,
      communication_preferences: content.communication_preferences,
      content_preferences: content.content_preferences,
      timing: content.timing_preferences
    };
  } else if (hasStructuredData) {
    // New structured format from extraction system
    personaDetails = content.persona_details || {};
    behavioralData = content.behavioral_data || {};
    engagementPreferences = content.engagement_preferences || {};
    locationInfo = content.location;
  } else {
    // Fallback for unknown formats
    return <GenericViewer content={content} hasStructuredData={hasStructuredData} />
  }

  return (
    <div className="space-y-6">
      {/* Structured Data Indicator */}
      {hasStructuredData && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          Enhanced structured data view
        </div>
      )}

      {/* Header Section */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-600 to-amber-600 flex items-center justify-center text-white text-2xl font-bold">
          {personaDetails.name?.charAt(0) || 'P'}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{personaDetails.name || 'Unnamed Persona'}</h2>
          {personaDetails.role && <p className="text-lg text-muted-foreground">{personaDetails.role}</p>}
          <div className="flex flex-wrap items-center gap-4 mt-2">
            {personaDetails.company_details && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{personaDetails.company_details}</span>
              </div>
            )}
            {personaDetails.industry && (
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{personaDetails.industry}</span>
              </div>
            )}
            {locationInfo && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {typeof locationInfo === 'string'
                    ? locationInfo
                    : locationInfo.city && locationInfo.state
                      ? `${locationInfo.city}, ${locationInfo.state}${locationInfo.country ? `, ${locationInfo.country}` : ''}`
                      : locationInfo.description || 'Location not specified'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demographics */}
      {personaDetails.demographics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Demographics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {renderContent(personaDetails.demographics)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Behavioral Data and Engagement Preferences in Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="behavioral" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="behavioral">Behavioral Data</TabsTrigger>
              <TabsTrigger value="engagement">Engagement Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="behavioral" className="mt-4 space-y-4">
              {(behavioralData.goals || content.goals) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-green-500" />
                    Goals
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(behavioralData.goals || content.goals)}
                  </div>
                </div>
              )}

              {(behavioralData.pain_points || content.pain_points) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Pain Points
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(behavioralData.pain_points || content.pain_points)}
                  </div>
                </div>
              )}

              {(behavioralData.motivations || content.motivations) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    Motivations
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(behavioralData.motivations || content.motivations)}
                  </div>
                </div>
              )}

              {(behavioralData.decision_making_process) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    Decision Making Process
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(behavioralData.decision_making_process)}
                  </div>
                </div>
              )}

              {(behavioralData.jobs_to_be_done || content.jobs_to_be_done) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    Jobs to Be Done
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(behavioralData.jobs_to_be_done || content.jobs_to_be_done)}
                  </div>
                </div>
              )}

              {(behavioralData.decision_criteria || content.decision_criteria) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-teal-500" />
                    Decision Criteria
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(behavioralData.decision_criteria || content.decision_criteria)}
                  </div>
                </div>
              )}

              {(behavioralData.objections || content.objections) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Objections
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(behavioralData.objections || content.objections)}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="engagement" className="mt-4 space-y-4">
              {(engagementPreferences.communication_channels || engagementPreferences.preferred_channels || content.preferred_channels) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    Preferred Channels
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(engagementPreferences.communication_channels || engagementPreferences.preferred_channels || content.preferred_channels)}
                  </div>
                </div>
              )}

              {(engagementPreferences.communication_preferences || content.communication_preferences) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    Communication Preferences
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(engagementPreferences.communication_preferences || content.communication_preferences)}
                  </div>
                </div>
              )}

              {(engagementPreferences.content_preferences || content.content_preferences) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    Content Preferences
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(engagementPreferences.content_preferences || content.content_preferences)}
                  </div>
                </div>
              )}

              {(engagementPreferences.timing || engagementPreferences.timing_preferences || content.timing_preferences) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Timing Preferences
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    {renderContent(engagementPreferences.timing || engagementPreferences.timing_preferences || content.timing_preferences)}
                  </div>
                </div>
              )}

              {content.buying_stage && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-amber-500" />
                    Buying Stage
                  </h4>
                  <Badge variant="outline" className="capitalize">
                    {content.buying_stage}
                  </Badge>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}