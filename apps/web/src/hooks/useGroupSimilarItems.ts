import { useMemo, useState } from 'react';

/**
 * Configuration for similarity detection
 */
export interface SimilarityConfig<T> {
  /**
   * Function to generate a key for grouping similar items
   * Items with the same key will be grouped together
   */
  getGroupKey: (item: T) => string;
  
  /**
   * Optional: Function to calculate similarity score between two items (0-1)
   * If provided, items will only be grouped if score exceeds threshold
   */
  calculateSimilarity?: (item1: T, item2: T) => number;
  
  /**
   * Threshold for similarity score (default: 0.8)
   * Only used if calculateSimilarity is provided
   */
  similarityThreshold?: number;
  
  /**
   * Sort function for items within a group
   * Default: sorts by creation date if available
   */
  sortWithinGroup?: (a: T, b: T) => number;
  
  /**
   * Sort function for groups themselves
   * Default: sorts by most recent item in group
   */
  sortGroups?: (a: GroupedItem<T>, b: GroupedItem<T>) => number;
}

/**
 * Represents a group of similar items
 */
export interface GroupedItem<T> {
  /** The primary/representative item of the group */
  primary: T;
  /** All similar items in this group */
  items: T[];
  /** Number of similar items (including primary) */
  count: number;
  /** Group identifier */
  groupKey: string;
  /** Whether this group is expanded in the UI */
  isExpanded?: boolean;
}

/**
 * Built-in similarity strategies for common use cases
 */
export const SimilarityStrategies = {
  /**
   * Group by exact title match (case-insensitive)
   */
  byTitle: <T extends { title: string }>(): SimilarityConfig<T> => ({
    getGroupKey: (item) => item.title.toLowerCase().trim(),
  }),
  
  /**
   * Group by title prefix (first N characters)
   */
  byTitlePrefix: <T extends { title: string }>(prefixLength: number = 50): SimilarityConfig<T> => ({
    getGroupKey: (item) => item.title.substring(0, prefixLength).toLowerCase().trim(),
  }),
  
  /**
   * Group by content hash (for detecting exact duplicates)
   */
  byContentHash: <T extends { content: string }>(): SimilarityConfig<T> => ({
    getGroupKey: (item) => {
      // Simple hash function for content
      let hash = 0;
      const str = item.content.slice(0, 200); // Use first 200 chars for performance
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString();
    },
  }),
  
  /**
   * Group by multiple fields (composite key)
   */
  byComposite: <T>(...getters: Array<(item: T) => string>): SimilarityConfig<T> => ({
    getGroupKey: (item) => getters.map(getter => getter(item)).join('|'),
  }),
  
  /**
   * Group marketing strategies by similarity
   */
  marketingStrategy: <T extends { 
    title?: string;
    value_propositions?: any;
    key_messages?: any;
    channel_mix?: any;
  }>(): SimilarityConfig<T> => ({
    getGroupKey: (item) => {
      // Create a fingerprint based on key strategy elements
      const parts = [];
      
      if (item.title) {
        parts.push(item.title.slice(0, 30).toLowerCase());
      }
      
      // Add key proposition if exists
      if (item.value_propositions?.primary) {
        parts.push(item.value_propositions.primary.slice(0, 30).toLowerCase());
      }
      
      // Add primary channel if exists
      if (item.channel_mix?.owned?.[0]) {
        parts.push(item.channel_mix.owned[0].toLowerCase());
      }
      
      return parts.join('|');
    },
    calculateSimilarity: (item1, item2) => {
      let score = 0;
      let factors = 0;
      
      // Compare titles
      if (item1.title && item2.title) {
        const titleSimilarity = calculateStringSimilarity(item1.title, item2.title);
        score += titleSimilarity * 0.3;
        factors += 0.3;
      }
      
      // Compare value propositions
      if (item1.value_propositions && item2.value_propositions) {
        const vpSimilarity = calculateObjectSimilarity(
          item1.value_propositions, 
          item2.value_propositions
        );
        score += vpSimilarity * 0.4;
        factors += 0.4;
      }
      
      // Compare channel mix
      if (item1.channel_mix && item2.channel_mix) {
        const channelSimilarity = calculateObjectSimilarity(
          item1.channel_mix,
          item2.channel_mix
        );
        score += channelSimilarity * 0.3;
        factors += 0.3;
      }
      
      return factors > 0 ? score / factors : 0;
    },
    similarityThreshold: 0.75,
  }),
};

/**
 * Hook for grouping similar items with UI state management
 */
export function useGroupSimilarItems<T extends { id: string; created_at?: string }>(
  items: T[],
  config: SimilarityConfig<T>,
  options?: {
    /** Whether to enable grouping (default: true) */
    enabled?: boolean;
    /** Initial expanded state for all groups (default: false) */
    initialExpanded?: boolean;
  }
) {
  const { enabled = true, initialExpanded = false } = options || {};
  
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    initialExpanded ? new Set() : new Set()
  );
  
  // Group the items
  const grouped = useMemo(() => {
    if (!enabled || items.length === 0) {
      // Return ungrouped items as single-item groups
      return items.map(item => ({
        primary: item,
        items: [item],
        count: 1,
        groupKey: item.id,
        isExpanded: false,
      }));
    }
    
    const groups: Map<string, T[]> = new Map();
    
    // Group items by key
    if (config.calculateSimilarity) {
      // Advanced similarity-based grouping
      const ungrouped = [...items];
      
      while (ungrouped.length > 0) {
        const current = ungrouped.shift()!;
        const groupKey = config.getGroupKey(current);
        const group = [current];
        
        // Find similar items
        for (let i = ungrouped.length - 1; i >= 0; i--) {
          const similarity = config.calculateSimilarity(current, ungrouped[i]);
          if (similarity >= (config.similarityThreshold || 0.8)) {
            group.push(ungrouped.splice(i, 1)[0]);
          }
        }
        
        groups.set(groupKey, group);
      }
    } else {
      // Simple key-based grouping
      items.forEach(item => {
        const key = config.getGroupKey(item);
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(item);
      });
    }
    
    // Convert to GroupedItem format
    const groupedItems: GroupedItem<T>[] = Array.from(groups.entries()).map(([key, items]) => {
      // Sort items within group
      const sortedItems = config.sortWithinGroup 
        ? [...items].sort(config.sortWithinGroup)
        : [...items].sort((a, b) => {
            // Default: sort by creation date (newest first)
            if (a.created_at && b.created_at) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return 0;
          });
      
      return {
        primary: sortedItems[0], // Most recent or first by sort
        items: sortedItems,
        count: sortedItems.length,
        groupKey: key,
        isExpanded: expandedGroups.has(key),
      };
    });
    
    // Sort groups
    if (config.sortGroups) {
      groupedItems.sort(config.sortGroups);
    } else {
      // Default: sort by most recent item in group
      groupedItems.sort((a, b) => {
        const aDate = a.primary.created_at ? new Date(a.primary.created_at).getTime() : 0;
        const bDate = b.primary.created_at ? new Date(b.primary.created_at).getTime() : 0;
        return bDate - aDate;
      });
    }
    
    return groupedItems;
  }, [items, config, enabled, expandedGroups]);
  
  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };
  
  // Expand all groups
  const expandAll = () => {
    setExpandedGroups(new Set(grouped.map(g => g.groupKey)));
  };
  
  // Collapse all groups
  const collapseAll = () => {
    setExpandedGroups(new Set());
  };
  
  // Get flat list of all items (for export, etc.)
  const allItems = useMemo(() => {
    return grouped.flatMap(g => g.items);
  }, [grouped]);
  
  // Statistics
  const stats = useMemo(() => ({
    totalItems: items.length,
    totalGroups: grouped.length,
    duplicatesFound: items.length - grouped.length,
    largestGroup: Math.max(...grouped.map(g => g.count), 0),
  }), [items, grouped]);
  
  return {
    grouped,
    toggleGroup,
    expandAll,
    collapseAll,
    allItems,
    stats,
    isGrouped: enabled,
  };
}

// Helper functions for similarity calculation

function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  // Levenshtein distance normalized to 0-1
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function calculateObjectSimilarity(obj1: any, obj2: any): number {
  if (!obj1 || !obj2) return 0;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  const allKeys = new Set([...keys1, ...keys2]);
  
  if (allKeys.size === 0) return 1;
  
  let matches = 0;
  allKeys.forEach(key => {
    if (obj1[key] && obj2[key]) {
      // Simple equality check (could be enhanced)
      if (JSON.stringify(obj1[key]) === JSON.stringify(obj2[key])) {
        matches++;
      }
    }
  });
  
  return matches / allKeys.size;
}