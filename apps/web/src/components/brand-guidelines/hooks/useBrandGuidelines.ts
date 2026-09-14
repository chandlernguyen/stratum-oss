import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useGroupSimilarItems } from '@/hooks/useGroupSimilarItems';

// Structured Guidelines Interfaces
interface ToneOfVoice {
  primary?: string;
  characteristics?: string[];
  avoid?: string[];
}

interface PersonalityTraits {
  archetype?: string;
  attributes?: string[];
  examples?: string;
}

interface WritingStyle {
  sentence_length?: string;
  vocabulary?: string;
  perspective?: string;
  formatting?: string[];
}

interface BrandVoice {
  tone_of_voice?: ToneOfVoice;
  personality_traits?: PersonalityTraits;
  writing_style?: WritingStyle;
}

interface KeyMessages {
  primary?: string;
  supporting?: string[];
  differentiation?: string;
}

interface ValuePropositions {
  functional?: string;
  emotional?: string;
  social?: string;
}

interface ContentRules {
  always_do?: string[];
  never_do?: string[];
  required_elements?: string[];
  prohibited_words?: string[];
}

interface Messaging {
  key_messages?: KeyMessages;
  value_propositions?: ValuePropositions;
  content_rules?: ContentRules;
}

interface BrandStrategy {
  mission?: string;
  vision?: string;
  values?: string[];
  target_audience?: string;
}

interface VisualIdentity {
  color_palette?: string[];
  typography?: string[];
  logo_guidelines?: string;
}

interface StructuredGuidelines {
  brand_voice?: BrandVoice;
  messaging?: Messaging;
  brand_strategy?: BrandStrategy;
  visual_identity?: VisualIdentity;
}

export interface BrandGuideline {
  id: string;
  org_id: string;
  campaign_id?: string;
  name?: string;
  description?: string;
  guidelines: StructuredGuidelines;
  is_default?: boolean;
  version?: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
}

interface UseBrandGuidelinesOptions {
  orgId?: string;
  campaignId?: string;
  clientId?: string; // For agency schema routing
  showArchived?: boolean;
}

interface MultipleActiveAlert {
  type: 'duplicate_active' | 'multiple_active';
  count: number;
  message: string;
  recommendation: string;
  duplicateCount?: number;
}

export function useBrandGuidelines({ orgId, campaignId, clientId, showArchived = false }: UseBrandGuidelinesOptions) {
  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [currentGuideline, setCurrentGuideline] = useState<BrandGuideline | null>(null);
  const [loading, setLoading] = useState(true);

  // Similarity detection configuration
  const brandGuidelinesSimilarity = useMemo(() => ({
    getGroupKey: (item: BrandGuideline) => {
      const parts = [];

      if (item.name) {
        parts.push(item.name.toLowerCase().trim());
      }

      if (item.guidelines?.brand_voice?.tone_of_voice?.primary) {
        parts.push(item.guidelines.brand_voice.tone_of_voice.primary.toLowerCase());
      }

      if (item.guidelines?.messaging?.key_messages?.primary) {
        parts.push(item.guidelines.messaging.key_messages.primary.slice(0, 50).toLowerCase());
      }

      return parts.join('|') || item.id;
    },
    calculateSimilarity: (item1: BrandGuideline, item2: BrandGuideline) => {
      const str1 = JSON.stringify(item1.guidelines);
      const str2 = JSON.stringify(item2.guidelines);

      if (str1 === str2) return 1.0;

      let score = 0;
      let factors = 0;

      // Compare names
      if (item1.name && item2.name && item1.name === item2.name) {
        score += 0.3;
      }
      factors += 0.3;

      // Compare brand voice
      const voice1 = JSON.stringify(item1.guidelines?.brand_voice || {});
      const voice2 = JSON.stringify(item2.guidelines?.brand_voice || {});
      if (voice1 === voice2) {
        score += 0.4;
      }
      factors += 0.4;

      // Compare messaging
      const msg1 = JSON.stringify(item1.guidelines?.messaging || {});
      const msg2 = JSON.stringify(item2.guidelines?.messaging || {});
      if (msg1 === msg2) {
        score += 0.3;
      }
      factors += 0.3;

      return score / factors;
    },
    similarityThreshold: 0.85,
  }), []);

  const {
    grouped: groupedGuidelines,
    stats: groupingStats
  } = useGroupSimilarItems(
    guidelines,
    brandGuidelinesSimilarity,
    { enabled: true }
  );

  // Check for multiple active guidelines
  const multipleActiveAlert = useMemo<MultipleActiveAlert | null>(() => {
    const activeGuidelines = guidelines.filter(g => !g.archived_at);

    if (activeGuidelines.length <= 1) {
      return null;
    }

    const duplicateGroups = groupedGuidelines.filter(group =>
      group.count > 1 &&
      group.items.filter(item => !item.archived_at).length > 1
    );

    if (duplicateGroups.length > 0) {
      return {
        type: 'duplicate_active' as const,
        count: activeGuidelines.length,
        message: `You have ${activeGuidelines.length} active brand guidelines, and some appear to be duplicates.`,
        recommendation: 'Archive or deactivate duplicate guidelines to avoid confusion.',
        duplicateCount: duplicateGroups.reduce((sum, group) =>
          sum + group.items.filter(item => !item.archived_at).length - 1, 0
        )
      };
    }

    return {
      type: 'multiple_active' as const,
      count: activeGuidelines.length,
      message: `You have ${activeGuidelines.length} active brand guidelines.`,
      recommendation: 'Consider consolidating or archiving older versions to maintain consistency.'
    };
  }, [guidelines, groupedGuidelines]);

  const fetchGuidelines = async () => {
    setLoading(true);
    try {
      if (!orgId) {
        console.log('[useBrandGuidelines] No org_id provided');
        setLoading(false);
        return;
      }

      console.log('[useBrandGuidelines] Fetching guidelines:', { orgId, clientId, campaignId, showArchived });

      // Use schema router function for automatic SME/Agency routing
      const { data, error } = await supabase.rpc('get_brand_guidelines_routed', {
        p_org_id: orgId,
        p_client_id: clientId || null
      });

      if (error) {
        console.error('[useBrandGuidelines] Error fetching brand guidelines:', error);
        setGuidelines([]);
        setCurrentGuideline(null);
      } else {
        console.log('[useBrandGuidelines] Raw data from router:', data);

        // Filter by campaign if provided
        let filteredData = data || [];
        if (campaignId) {
          filteredData = filteredData.filter((g: BrandGuideline) => g.campaign_id === campaignId);
        }

        // Filter archived items unless explicitly requested
        if (!showArchived) {
          filteredData = filteredData.filter((g: BrandGuideline) => !g.archived_at);
        }

        console.log('[useBrandGuidelines] Filtered guidelines:', filteredData);
        setGuidelines(filteredData);

        // Set current guideline (prefer non-archived, then most recent)
        const activeGuideline = filteredData.find((g: BrandGuideline) => !g.archived_at) || filteredData[0];
        setCurrentGuideline(activeGuideline || null);
      }
    } catch (error) {
      console.error('Error fetching brand guidelines:', error);
      setGuidelines([]);
      setCurrentGuideline(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchGuidelines();
    }
  }, [orgId, clientId, campaignId, showArchived]);

  return {
    guidelines,
    currentGuideline,
    setCurrentGuideline,
    loading,
    groupedGuidelines,
    groupingStats,
    multipleActiveAlert,
    refetch: fetchGuidelines,
  };
}
