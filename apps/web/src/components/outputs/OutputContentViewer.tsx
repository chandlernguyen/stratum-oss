import { PersonaViewer } from './viewers/PersonaViewer'
import { StrategyViewer } from './viewers/StrategyViewer'
import { MarketingStrategyViewer } from './viewers/MarketingStrategyViewer'
import { AnalyticsViewer } from './viewers/AnalyticsViewer'
import { ROIBudgetViewer } from './viewers/ROIBudgetViewer'
import { ContentViewer } from './viewers/ContentViewer'
import { CampaignPlanningViewer } from './viewers/CampaignPlanningViewer'
import { QuickStartViewer } from './viewers/QuickStartViewer'
import { GenericViewer } from './viewers/GenericViewer'

interface OutputContentViewerProps {
  output: any
}

export function OutputContentViewer({ output }: OutputContentViewerProps) {
  const agentType = output.agent_type

  // Parse content if it's a string (from API)
  let content = output.content
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content)
    } catch (e) {
      // If parsing fails, keep as string
    }
  }

  // Determine if we have structured data
  const hasStructuredData = content &&
    typeof content === 'object' &&
    content.structured_data &&
    content.extraction_status === 'success'

  // Extract the display data - use parsed content
  const displayData = hasStructuredData
    ? content.structured_data
    : (content?.response || content || output.raw_output)

  // Agent type-specific rendering
  switch (agentType) {
    case 'persona':
      return <PersonaViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'strategy':
      return <StrategyViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'marketing_strategy':
      return <MarketingStrategyViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'content':
      return <ContentViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'analytics':
      return <AnalyticsViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'roi_budget':
      return <ROIBudgetViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'campaign_planning':
      return <CampaignPlanningViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'quick_start':
      return <QuickStartViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'quick_wins':
      return <GenericViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'competitive_intelligence':
      return <GenericViewer content={displayData} hasStructuredData={hasStructuredData} />
    case 'client_success':
      return <GenericViewer content={displayData} hasStructuredData={hasStructuredData} />
    default:
      return <GenericViewer content={displayData} hasStructuredData={hasStructuredData} />
  }
}