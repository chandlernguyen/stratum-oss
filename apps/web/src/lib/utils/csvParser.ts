/**
 * CSV parsing utilities for campaign metrics import
 * Date: 2025-10-16
 * Security: Sanitizes CSV data to prevent formula injection attacks
 */

import { sanitizeCSVCell, hasCSVInjectionRisk } from './csvSanitizer';

export interface ParsedCSV {
  headers: string[];
  data: Record<string, any>[];
  errors: string[];
}

/**
 * Parse CSV file to array of objects
 * @param file CSV File object
 * @returns Parsed CSV data with headers and rows
 */
export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  const text = await file.text();
  return parseCSVText(text);
}

/**
 * Parse CSV text to array of objects
 * @param text CSV text content
 * @returns Parsed CSV data with headers and rows
 */
export function parseCSVText(text: string): ParsedCSV {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      headers: [],
      data: [],
      errors: ['CSV file is empty']
    };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);

  if (headers.length === 0) {
    return {
      headers: [],
      data: [],
      errors: ['No headers found in CSV']
    };
  }

  // Parse data rows
  const data: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // Skip empty rows
    if (values.every(v => v === '')) continue;

    // Validate row has correct number of columns
    if (values.length !== headers.length) {
      errors.push(
        `Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`
      );
      continue;
    }

    // Create object from headers and values with sanitization
    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      const value = values[index];

      // Sanitize values to prevent CSV injection
      if (typeof value === 'string' && hasCSVInjectionRisk(value)) {
        // Sanitize by prefixing with single quote
        row[header] = sanitizeCSVCell(value).slice(1); // Remove the quote we added, just clean the value
      } else {
        row[header] = value;
      }
    });

    data.push(row);
  }

  return { headers, data, errors };
}

/**
 * Parse a single CSV line, handling quoted values
 * @param line CSV line text
 * @returns Array of values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      result.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Add last field
  result.push(currentValue.trim());

  return result;
}

/**
 * Validate campaign metrics CSV data
 * @param data Parsed CSV data
 * @returns Validation errors
 */
export function validateCampaignMetricsCSV(data: Record<string, any>[]): string[] {
  const errors: string[] = [];
  const requiredFields = ['campaign_name', 'metric_date', 'spend'];

  if (data.length === 0) {
    errors.push('CSV contains no data rows');
    return errors;
  }

  // Check required fields exist in first row
  const firstRow = data[0];
  const missingFields = requiredFields.filter(field => !(field in firstRow));

  if (missingFields.length > 0) {
    errors.push(
      `Missing required columns: ${missingFields.join(', ')}. ` +
      `Required columns are: campaign_name, metric_date, spend`
    );
  }

  // Validate each row
  data.forEach((row, index) => {
    // Check campaign_name
    if (!row.campaign_name || row.campaign_name.trim() === '') {
      errors.push(`Row ${index + 2}: campaign_name is required`);
    }

    // Check metric_date format (YYYY-MM-DD)
    if (!row.metric_date) {
      errors.push(`Row ${index + 2}: metric_date is required`);
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.metric_date)) {
        errors.push(
          `Row ${index + 2}: metric_date must be in YYYY-MM-DD format, got: ${row.metric_date}`
        );
      }
    }

    // Check spend is a valid number
    if (row.spend === undefined || row.spend === '') {
      errors.push(`Row ${index + 2}: spend is required`);
    } else {
      const spend = parseFloat(row.spend);
      if (isNaN(spend) || spend < 0) {
        errors.push(`Row ${index + 2}: spend must be a positive number, got: ${row.spend}`);
      }
    }

    // Optional: Validate numeric fields if present
    const numericFields = [
      'revenue', 'impressions', 'clicks', 'conversions',
      'leads', 'qualified_leads', 'calls', 'appointments', 'form_fills', 'conversion_value',
      'video_views', 'likes', 'shares', 'comments', 'saves', 'profile_visits',
      'followers_gained', 'watch_time_seconds'
    ];
    numericFields.forEach(field => {
      if (row[field] !== undefined && row[field] !== '') {
        const value = parseFloat(row[field]);
        if (isNaN(value) || value < 0) {
          errors.push(
            `Row ${index + 2}: ${field} must be a positive number, got: ${row[field]}`
          );
        }
      }
    });

    // Validate conversion_goal if present
    if (row.conversion_goal && row.conversion_goal !== '') {
      const validGoals = ['revenue', 'leads', 'calls', 'appointments', 'form_fills',
                          'downloads', 'signups', 'demo_requests', 'other'];
      if (!validGoals.includes(row.conversion_goal.toLowerCase())) {
        errors.push(
          `Row ${index + 2}: conversion_goal must be one of: ${validGoals.join(', ')}, got: ${row.conversion_goal}`
        );
      }
    }

    // Validate source if present
    if (row.source && row.source !== '') {
      const validSources = ['google_ads', 'meta_ads', 'linkedin_ads', 'manual', 'other'];
      if (!validSources.includes(row.source.toLowerCase())) {
        errors.push(
          `Row ${index + 2}: source must be one of: ${validSources.join(', ')}, got: ${row.source}`
        );
      }
    }
  });

  return errors;
}

/**
 * Transform CSV data to campaign metrics format
 * @param data Parsed CSV data
 * @returns Campaign metrics data ready for import
 */
export function transformToCampaignMetrics(data: Record<string, any>[]): any[] {
  return data.map(row => ({
    // Required fields
    campaign_name: row.campaign_name?.trim(),
    metric_date: row.metric_date,
    spend: parseFloat(row.spend || '0'),

    // Basic e-commerce metrics
    revenue: row.revenue ? parseFloat(row.revenue) : null,
    impressions: row.impressions ? parseInt(row.impressions) : null,
    clicks: row.clicks ? parseInt(row.clicks) : null,
    conversions: row.conversions ? parseInt(row.conversions) : null,

    // Lead generation metrics
    leads: row.leads ? parseInt(row.leads) : null,
    qualified_leads: row.qualified_leads ? parseInt(row.qualified_leads) : null,
    calls: row.calls ? parseInt(row.calls) : null,
    appointments: row.appointments ? parseInt(row.appointments) : null,
    form_fills: row.form_fills ? parseInt(row.form_fills) : null,
    conversion_goal: row.conversion_goal?.trim() || null,
    conversion_value: row.conversion_value ? parseFloat(row.conversion_value) : null,

    // Social media engagement metrics
    video_views: row.video_views ? parseInt(row.video_views) : null,
    likes: row.likes ? parseInt(row.likes) : null,
    shares: row.shares ? parseInt(row.shares) : null,
    comments: row.comments ? parseInt(row.comments) : null,
    saves: row.saves ? parseInt(row.saves) : null,
    profile_visits: row.profile_visits ? parseInt(row.profile_visits) : null,
    followers_gained: row.followers_gained ? parseInt(row.followers_gained) : null,
    watch_time_seconds: row.watch_time_seconds ? parseInt(row.watch_time_seconds) : null,

    // Metadata
    source: row.source?.trim() || 'csv',
    notes: row.notes?.trim() || null
  }));
}

/**
 * Download sample CSV template
 * @returns CSV template string
 */
export function generateCSVTemplate(): string {
  return [
    // Instruction rows - users must delete these before uploading
    '>>> STRAŦUM CAMPAIGN METRICS TEMPLATE <<<',
    '>>> INSTRUCTIONS: Delete rows 1-6 before uploading. Keep row 7 (headers) and add your data below. <<<',
    '',
    '>>> REQUIRED FIELDS: campaign_name, metric_date (YYYY-MM-DD format), spend <<<',
    '>>> OPTIONAL FIELDS: All other columns - leave blank if not applicable to your campaign type <<<',
    '>>> CAMPAIGN TYPES: E-commerce (revenue tracking) | B2B (lead generation) | Social Media (engagement) <<<',
    '',

    // Headers with REQUIRED/OPTIONAL indicators
    'campaign_name (REQUIRED),metric_date (REQUIRED - Format: YYYY-MM-DD),spend (REQUIRED - Format: 1500.00),source (recommended: google_ads|meta_ads|linkedin_ads|manual|other),' +
    'revenue (e-commerce only),impressions (optional),clicks (optional),conversions (optional),' +
    'leads (B2B only),qualified_leads (B2B only),calls (B2B only),appointments (B2B only),form_fills (B2B only),conversion_goal (B2B: leads|calls|appointments|form_fills|other),conversion_value (B2B: avg value per conversion),' +
    'video_views (social only),likes (social only),shares (social only),comments (social only),saves (social only),profile_visits (social only),followers_gained (social only),watch_time_seconds (social only),' +
    'notes (optional)',

    // Example 1: E-commerce revenue campaign - comprehensive metrics
    'Summer Sale 2025 - Google Shopping,2025-10-01,1500.00,google_ads,' +
    '4500.00,50000,2500,150,' + // Revenue: $4500, strong 3.0x ROAS
    ',,,,,,,' + // No lead gen metrics - leave blank
    ',,,,,,,' + // No social metrics - leave blank
    'E-commerce campaign with 3.0x ROAS - Product: Summer apparel collection',

    // Example 2: B2B lead generation campaign - full lead funnel
    'Q4 Enterprise Outreach,2025-10-01,3500.00,linkedin_ads,' +
    ',45000,850,,' + // Impressions/clicks tracked, but no direct revenue
    '45,12,8,5,15,leads,500.00,' + // 45 total leads, 12 qualified, $500 avg value
    ',,,,,,,' + // No social metrics
    'B2B LinkedIn campaign - Target: Enterprise CMOs - 26.7% lead qualification rate',

    // Example 3: Social media engagement campaign - brand awareness
    'TikTok Brand Challenge - Oct 2025,2025-10-01,800.00,meta_ads,' +
    ',250000,5200,,' + // High impressions, some clicks, no direct conversions
    ',,,,,,,' + // No lead gen metrics
    '125000,3500,450,890,1200,2100,250,180000,' + // Social: 125k views, 2.8% engagement rate
    'Viral brand awareness campaign - 2.8% engagement rate - Product launch',

    // Example 4: Minimal required fields only - simple tracking
    'Monthly Email Newsletter,2025-10-02,250.00,manual,' +
    ',,,,,' + // No performance metrics tracked
    ',,,,,,,' +
    ',,,,,,,' +
    'Minimal tracking example - Only basic spend data',

    // Example 5: Multi-metric campaign - tracking everything
    'Holiday Promo - Multi-Channel,2025-10-03,5000.00,manual,' +
    '15000.00,120000,6000,300,' + // E-commerce: $15k revenue
    '85,20,12,8,25,leads,350.00,' + // B2B: Also generating leads
    '50000,2000,300,500,800,1200,150,90000,' + // Social: Strong engagement
    'Comprehensive multi-channel campaign tracking all metrics'
  ].join('\n');
}

/**
 * Trigger download of CSV template
 */
export function downloadCSVTemplate(): void {
  const template = generateCSVTemplate();
  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'campaign_metrics_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
