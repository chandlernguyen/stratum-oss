import type { AllToolOutputs } from '@/types/agentTools';
import { useTranslation } from 'react-i18next';

// Import all the tool-specific components
import { SWOTGrid } from './SWOTGrid';
import { PortersForces } from './PortersForces';
import { BusinessCanvas } from './BusinessCanvas';
import { ICEPrioritization } from './ICEPrioritization';
import { BCGMatrix } from './BCGMatrix';
import { VRIOFramework } from './VRIOFramework';
import { ThreeHorizons } from './ThreeHorizons';
import { BlueOceanStrategy } from './BlueOceanStrategy';
import { McKinsey7S } from './McKinsey7S';
import { OKRFramework } from './OKRFramework';
import { JobsToBeDone } from './JobsToBeDone';
import { PersonaCard } from './PersonaCard';
import { BuyerJourneyFlow } from './BuyerJourneyFlow';
import { InterviewQuestions } from './InterviewQuestions';
import { ContentIdeaCard } from './ContentIdeaCard';
import { BlogPostPreview } from './BlogPostPreview';
import { ContentCalendarView } from './ContentCalendarView';
import { AnalysisReportView } from './AnalysisReport';
import { OptimizationList } from './OptimizationList';
import { ForecastChart } from './ForecastChart';

// A more robust type guard to differentiate tool outputs
function detectToolType(data: any): string {
    if (!data) return 'UnknownTool';
    if ('strengths' in data && 'weaknesses' in data) return 'SWOTAnalysis';
    if ('industry_rivalry' in data) return 'PortersFiveForces';
    if ('customer_segments' in data && 'value_propositions' in data) return 'BusinessModelCanvas';
    if ('items' in data && data.items && data.items.length > 0) {
        if ('impact_score' in data.items[0]) return 'ICEPrioritization';
        if ('category' in data.items[0] && 'market_growth_rate' in data.items[0]) return 'BCGMatrix';
    }
    if ('resources' in data && data.resources && data.resources.length > 0 && 'valuable' in data.resources[0]) return 'VRIOAnalysis';
    if ('horizon_1' in data && 'horizon_2' in data && 'horizon_3' in data) return 'ThreeHorizons';
    if ('four_actions_framework' in data && 'blue_ocean_opportunity' in data) return 'BlueOceanStrategy';
    if ('elements' in data && data.elements && data.elements.length > 0 && 'current_state' in data.elements[0] && 'desired_state' in data.elements[0]) return 'McKinsey7S';
    if ('company_okrs' in data && 'team_okrs' in data) return 'OKRFramework';
    if ('primary_jobs' in data && 'underserved_jobs' in data) return 'JobsToBeDone';
    if ('psychographics' in data) return 'Persona';
    if ('stages' in data) return 'BuyerJourney';
    if ('questions' in data) return 'InterviewQuestions';
    if ('angle' in data && 'target_persona' in data) return 'ContentIdea';
    if ('outline' in data && 'seo_keywords' in data) return 'BlogPost';
    if ('schedule' in data) return 'ContentCalendar';
    if ('findings' in data) return 'AnalysisReport';
    if (Array.isArray(data) && data.length > 0 && 'expected_impact' in data[0]) return 'OptimizationList';
    if ('forecast_value' in data) return 'ForecastChart';
    return 'UnknownTool';
}

interface ToolOutputRendererProps {
  data: AllToolOutputs;
  textExplanation: string;
}

export function ToolOutputRenderer({ data, textExplanation }: ToolOutputRendererProps) {
  const { t } = useTranslation('agents');
  const toolType = detectToolType(data);

  // Optional: Display the agent's text explanation above the tool output
  const explanation = textExplanation && (
    <p className="mb-4 text-sm text-brand-slate dark:text-gray-300 italic">
      {textExplanation}
    </p>
  );

  switch (toolType) {
    case 'SWOTAnalysis':
      return <SWOTGrid data={data as any} />;
    case 'PortersFiveForces':
      return <PortersForces data={data as any} />;
    case 'BusinessModelCanvas':
        return <BusinessCanvas data={data as any} />;
    case 'ICEPrioritization':
        return <ICEPrioritization data={data as any} />;
    case 'BCGMatrix':
        return <BCGMatrix data={data as any} />;
    case 'VRIOAnalysis':
        return <VRIOFramework data={data as any} />;
    case 'ThreeHorizons':
        return <ThreeHorizons data={data as any} />;
    case 'BlueOceanStrategy':
        return <BlueOceanStrategy data={data as any} />;
    case 'McKinsey7S':
        return <McKinsey7S data={data as any} />;
    case 'OKRFramework':
        return <OKRFramework data={data as any} />;
    case 'JobsToBeDone':
        return <JobsToBeDone data={data as any} />;
    case 'Persona':
        return <PersonaCard data={data as any} />;
    case 'BuyerJourney':
        return <BuyerJourneyFlow data={data as any} />;
    case 'InterviewQuestions':
        return <InterviewQuestions data={data as any} />;
    case 'ContentIdea':
        // Assuming a single idea is passed for now, adjust if it's a list
        return <ContentIdeaCard idea={data as any} />;
    case 'BlogPost':
        return <BlogPostPreview data={data as any} />;
    case 'ContentCalendar':
        return <ContentCalendarView data={data as any} />;
    case 'AnalysisReport':
        return <AnalysisReportView data={data as any} />;
    case 'OptimizationList':
        return <OptimizationList data={data as any} />;
    case 'ForecastChart':
        return <ForecastChart data={data as any} />;

    // Default fallback for unknown or unimplemented tools
    default:
      return (
        <div className="p-4 my-2 border rounded-lg bg-gray-50 dark:bg-gray-900 w-full text-left">
          {explanation}
          <details className="cursor-pointer">
            <summary className="text-xs font-mono text-brand-slate dark:text-gray-400">
              {t('toolRenderers.common.toolOutput', { type: toolType })} ({t('toolRenderers.common.clickToView')})
            </summary>
            <pre className="mt-2 text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
              <code>{JSON.stringify(data, null, 2)}</code>
            </pre>
          </details>
        </div>
      );
  }
}
