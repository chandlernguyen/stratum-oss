import { getCurrentLanguage } from '@/lib/i18n';
import { getIntlLocale } from '@/lib/locales';

function getContextIntlLocale() {
  return getIntlLocale(getCurrentLanguage());
}

function formatGoals(goals: unknown): string {
  if (Array.isArray(goals)) return goals.join(', ');
  if (typeof goals === 'string') return goals;

  if (goals && typeof goals === 'object' && 'goals' in goals && typeof (goals as { goals?: unknown }).goals === 'string') {
    return (goals as { goals: string }).goals;
  }

  return '';
}

export function formatCampaignBudgetValue(budget?: number | null): string {
  if (!budget) return 'Not specified';
  return budget.toLocaleString(getContextIntlLocale());
}

export function formatCampaignTimelineValue(startDate?: string | null, endDate?: string | null): string {
  if (!startDate || !endDate) return 'Not specified';

  const intlLocale = getContextIntlLocale();
  return `${new Date(startDate).toLocaleDateString(intlLocale)} to ${new Date(endDate).toLocaleDateString(intlLocale)}`;
}

export function buildAgentCampaignContext(
  campaign: {
    name?: string | null;
    goals?: unknown;
    target_audience?: string | null;
    budget?: number | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null | undefined,
  instruction: string
): string {
  if (!campaign) return '';

  return `
    Active Campaign: ${campaign.name || ''}
    Objectives: ${formatGoals(campaign.goals)}
    Budget: $${formatCampaignBudgetValue(campaign.budget)}
    Target Audience: ${campaign.target_audience || 'Not specified'}
    Timeline: ${formatCampaignTimelineValue(campaign.start_date, campaign.end_date)}
    
    ${instruction}
  `;
}
