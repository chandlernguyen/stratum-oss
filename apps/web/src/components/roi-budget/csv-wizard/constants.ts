export const REQUIRED_FIELDS = ['campaign_name', 'metric_date', 'spend'];

export const OPTIONAL_FIELDS = [
  // Conversion metrics
  'revenue',
  'impressions',
  'clicks',
  'conversions',
  'leads',
  'calls',
  'appointments',
  'conversion_goal',

  // Engagement metrics (Phase 6.5)
  'video_views',
  'likes',
  'shares',
  'comments',
  'saves',
  'profile_visits',

  // Source & notes
  'source',
  'notes'
];

export const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

export const FIELD_DESCRIPTIONS: Record<string, string> = {
  campaign_name: 'The name of your campaign (e.g., "Summer Sale 2025")',
  metric_date: 'Date in YYYY-MM-DD format (e.g., 2025-10-15)',
  spend: 'Amount spent on this campaign day (numbers only, decimals OK)',

  // Conversion metrics
  revenue: 'Revenue generated from campaign (for e-commerce). Leave blank if tracking leads/calls instead',
  impressions: 'Number of times your ad was shown to users',
  clicks: 'Number of clicks on your ad',
  conversions: 'Completed actions like purchases, signups, downloads',
  leads: 'Number of leads generated (for B2B or lead-gen campaigns)',
  calls: 'Phone calls received from campaign',
  appointments: 'Appointments/demos booked from campaign',
  conversion_goal: 'What are you optimizing for? (revenue, leads, calls, appointments, etc.)',

  // Engagement metrics
  video_views: 'Number of video views (for video ads on Instagram, TikTok, YouTube)',
  likes: 'Likes/reactions on your social posts',
  shares: 'Number of shares/reposts (indicates viral potential)',
  comments: 'Comments on your posts (indicates engagement depth)',
  saves: 'Saves/bookmarks (Instagram, TikTok - indicates strong purchase intent)',
  profile_visits: 'Profile visits driven by campaign (indicates consideration)',

  // Source
  source: 'Where did this data come from? Options: google_ads, meta_ads, linkedin_ads, manual, other',
  notes: 'Any additional notes about this campaign day (optional)'
};

export const formatFieldName = (field: string): string => {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
