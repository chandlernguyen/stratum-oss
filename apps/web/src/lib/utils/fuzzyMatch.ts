/**
 * Fuzzy matching utilities for campaign name matching
 * Uses Levenshtein distance algorithm for string similarity
 * Date: 2025-10-16
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Distance (lower is more similar)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1, higher is more similar)
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score (1 = exact match, 0 = completely different)
 */
export function similarityScore(str1: string, str2: string): number {
  // Normalize strings (lowercase, trim)
  const norm1 = str1.toLowerCase().trim();
  const norm2 = str2.toLowerCase().trim();

  // Handle exact match
  if (norm1 === norm2) return 1.0;

  // Handle empty strings
  if (norm1.length === 0 || norm2.length === 0) return 0.0;

  // Calculate distance
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);

  // Convert distance to similarity score (0-1)
  return 1 - distance / maxLength;
}

/**
 * Match type for campaign matching
 */
export type MatchType = 'exact' | 'fuzzy' | 'none';

/**
 * Campaign match result
 */
export interface CampaignMatch<T = any> {
  campaign: T;
  matchType: MatchType;
  score: number;
}

/**
 * Find best matching campaign from a list
 * @param csvName Campaign name from CSV
 * @param campaigns List of campaigns to match against
 * @param threshold Minimum similarity score for fuzzy match (default: 0.8)
 * @returns Best match or null if no good match found
 */
export function findBestCampaignMatch<T extends { id: string; name: string }>(
  csvName: string,
  campaigns: T[],
  threshold: number = 0.8
): CampaignMatch<T> | null {
  if (!campaigns || campaigns.length === 0) return null;

  // Normalize CSV name
  const normCsvName = csvName.toLowerCase().trim();

  // First, try exact match
  const exactMatch = campaigns.find(c =>
    c.name.toLowerCase().trim() === normCsvName
  );

  if (exactMatch) {
    return {
      campaign: exactMatch,
      matchType: 'exact',
      score: 1.0
    };
  }

  // Find best fuzzy match
  let bestMatch: CampaignMatch<T> | null = null;
  let bestScore = 0;

  for (const campaign of campaigns) {
    const score = similarityScore(csvName, campaign.name);

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = {
        campaign,
        matchType: 'fuzzy',
        score
      };
    }
  }

  return bestMatch;
}

/**
 * Match all CSV campaign names against existing campaigns
 * @param csvNames Array of campaign names from CSV
 * @param campaigns List of existing campaigns
 * @param threshold Minimum similarity score for fuzzy match
 * @returns Map of CSV name to match result
 */
export function matchAllCampaigns<T extends { id: string; name: string }>(
  csvNames: string[],
  campaigns: T[],
  threshold: number = 0.8
): Map<string, CampaignMatch<T> | null> {
  const matches = new Map<string, CampaignMatch<T> | null>();

  for (const csvName of csvNames) {
    const match = findBestCampaignMatch(csvName, campaigns, threshold);
    matches.set(csvName, match);
  }

  return matches;
}

/**
 * Get unique campaign names from CSV data
 * @param csvData Array of CSV rows
 * @param campaignNameField Field name for campaign name (default: 'campaign_name')
 * @returns Array of unique campaign names
 */
export function extractUniqueCampaignNames(
  csvData: Record<string, any>[],
  campaignNameField: string = 'campaign_name'
): string[] {
  const uniqueNames = new Set<string>();

  for (const row of csvData) {
    const campaignName = row[campaignNameField];
    if (campaignName && typeof campaignName === 'string') {
      uniqueNames.add(campaignName.trim());
    }
  }

  return Array.from(uniqueNames);
}
