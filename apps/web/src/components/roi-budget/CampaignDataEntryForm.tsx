import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, Save, Calculator, /* ChevronDown, */ ChevronUp, Plus, TrendingUp, Users, Heart } from 'lucide-react'; // ChevronDown unused
import { useCreateCampaignMetric, useUpdateCampaignMetric, type CampaignMetric } from '@/hooks/data/useCampaignMetrics';
import { useCampaigns } from '@/hooks/data/useCampaigns';

interface CampaignDataEntryFormProps {
  initialData?: Partial<CampaignMetric>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CampaignDataEntryForm({
  initialData,
  onSuccess,
  onCancel
}: CampaignDataEntryFormProps) {
  const isEditMode = !!initialData?.id;
  const createMetric = useCreateCampaignMetric();
  const updateMetric = useUpdateCampaignMetric();

  // Fetch active campaigns for selector
  const { data: campaigns = [] } = useCampaigns({
    status: 'active',
    includeArchived: false
  });

  // Track which optional sections are expanded
  const [expandedSections, setExpandedSections] = useState({
    revenue: !!initialData?.revenue,
    leadGen: !!(initialData as any)?.leads || !!(initialData as any)?.calls,
    social: !!(initialData as any)?.video_views || !!(initialData as any)?.likes
  });

  const [formData, setFormData] = useState({
    campaign_id: (initialData as any)?.campaign_id || undefined,
    campaign_name: initialData?.campaign_name || '',
    metric_date: initialData?.metric_date || new Date().toISOString().split('T')[0],
    spend: initialData?.spend?.toString() || '',
    revenue: initialData?.revenue?.toString() || '',
    impressions: initialData?.impressions?.toString() || '',
    clicks: initialData?.clicks?.toString() || '',
    conversions: initialData?.conversions?.toString() || '',
    // Lead generation fields
    leads: (initialData as any)?.leads?.toString() || '',
    qualified_leads: (initialData as any)?.qualified_leads?.toString() || '',
    calls: (initialData as any)?.calls?.toString() || '',
    appointments: (initialData as any)?.appointments?.toString() || '',
    form_fills: (initialData as any)?.form_fills?.toString() || '',
    conversion_goal: (initialData as any)?.conversion_goal || '',
    conversion_value: (initialData as any)?.conversion_value?.toString() || '',
    // Social engagement fields
    video_views: (initialData as any)?.video_views?.toString() || '',
    likes: (initialData as any)?.likes?.toString() || '',
    shares: (initialData as any)?.shares?.toString() || '',
    comments: (initialData as any)?.comments?.toString() || '',
    saves: (initialData as any)?.saves?.toString() || '',
    profile_visits: (initialData as any)?.profile_visits?.toString() || '',
    followers_gained: (initialData as any)?.followers_gained?.toString() || '',
    watch_time_seconds: (initialData as any)?.watch_time_seconds?.toString() || '',
    source: initialData?.source || 'manual' as 'google_ads' | 'meta_ads' | 'linkedin_ads' | 'manual' | 'other',
    notes: initialData?.notes || ''
  });

  const [calculatedMetrics, setCalculatedMetrics] = useState({
    ctr: 0,
    cpc: 0,
    roi: 0
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        campaign_id: (initialData as any)?.campaign_id || undefined,
        campaign_name: initialData.campaign_name || '',
        metric_date: initialData.metric_date || new Date().toISOString().split('T')[0],
        spend: initialData.spend?.toString() || '',
        revenue: initialData.revenue?.toString() || '',
        impressions: initialData.impressions?.toString() || '',
        clicks: initialData.clicks?.toString() || '',
        conversions: initialData.conversions?.toString() || '',
        leads: (initialData as any)?.leads?.toString() || '',
        qualified_leads: (initialData as any)?.qualified_leads?.toString() || '',
        calls: (initialData as any)?.calls?.toString() || '',
        appointments: (initialData as any)?.appointments?.toString() || '',
        form_fills: (initialData as any)?.form_fills?.toString() || '',
        conversion_goal: (initialData as any)?.conversion_goal || '',
        conversion_value: (initialData as any)?.conversion_value?.toString() || '',
        video_views: (initialData as any)?.video_views?.toString() || '',
        likes: (initialData as any)?.likes?.toString() || '',
        shares: (initialData as any)?.shares?.toString() || '',
        comments: (initialData as any)?.comments?.toString() || '',
        saves: (initialData as any)?.saves?.toString() || '',
        profile_visits: (initialData as any)?.profile_visits?.toString() || '',
        followers_gained: (initialData as any)?.followers_gained?.toString() || '',
        watch_time_seconds: (initialData as any)?.watch_time_seconds?.toString() || '',
        source: initialData.source || 'manual',
        notes: initialData.notes || ''
      });

      // Auto-expand sections with data
      setExpandedSections({
        revenue: !!initialData.revenue,
        leadGen: !!(initialData as any)?.leads || !!(initialData as any)?.calls,
        social: !!(initialData as any)?.video_views || !!(initialData as any)?.likes
      });
    }
  }, [initialData]);

  // Auto-calculate metrics when relevant fields change
  useEffect(() => {
    const impressions = parseInt(formData.impressions) || 0;
    const clicks = parseInt(formData.clicks) || 0;
    const spend = parseFloat(formData.spend) || 0;
    const revenue = parseFloat(formData.revenue) || 0;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

    setCalculatedMetrics({
      ctr: parseFloat(ctr.toFixed(2)),
      cpc: parseFloat(cpc.toFixed(2)),
      roi: parseFloat(roi.toFixed(2))
    });
  }, [formData.impressions, formData.clicks, formData.spend, formData.revenue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.campaign_name.trim() || !formData.spend) {
      return;
    }

    const metricData = {
      campaign_id: formData.campaign_id || undefined,
      campaign_name: formData.campaign_name.trim(),
      metric_date: formData.metric_date,
      spend: parseFloat(formData.spend),
      revenue: formData.revenue ? parseFloat(formData.revenue) : undefined,
      impressions: formData.impressions ? parseInt(formData.impressions) : undefined,
      clicks: formData.clicks ? parseInt(formData.clicks) : undefined,
      conversions: formData.conversions ? parseInt(formData.conversions) : undefined,
      // Lead generation metrics
      leads: formData.leads ? parseInt(formData.leads) : undefined,
      qualified_leads: formData.qualified_leads ? parseInt(formData.qualified_leads) : undefined,
      calls: formData.calls ? parseInt(formData.calls) : undefined,
      appointments: formData.appointments ? parseInt(formData.appointments) : undefined,
      form_fills: formData.form_fills ? parseInt(formData.form_fills) : undefined,
      conversion_goal: formData.conversion_goal || undefined,
      conversion_value: formData.conversion_value ? parseFloat(formData.conversion_value) : undefined,
      // Social engagement metrics
      video_views: formData.video_views ? parseInt(formData.video_views) : undefined,
      likes: formData.likes ? parseInt(formData.likes) : undefined,
      shares: formData.shares ? parseInt(formData.shares) : undefined,
      comments: formData.comments ? parseInt(formData.comments) : undefined,
      saves: formData.saves ? parseInt(formData.saves) : undefined,
      profile_visits: formData.profile_visits ? parseInt(formData.profile_visits) : undefined,
      followers_gained: formData.followers_gained ? parseInt(formData.followers_gained) : undefined,
      watch_time_seconds: formData.watch_time_seconds ? parseInt(formData.watch_time_seconds) : undefined,
      // Calculated and metadata
      ctr: calculatedMetrics.ctr > 0 ? calculatedMetrics.ctr : undefined,
      cpc: calculatedMetrics.cpc > 0 ? calculatedMetrics.cpc : undefined,
      source: formData.source,
      import_method: 'manual' as const,
      notes: formData.notes || undefined
    };

    if (isEditMode && initialData?.id) {
      await updateMetric.mutateAsync({
        id: initialData.id,
        data: metricData
      });
    } else {
      await createMetric.mutateAsync(metricData);
    }

    onSuccess?.();
  };

  const isLoading = createMetric.isPending || updateMetric.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {isEditMode ? 'Edit Campaign Metrics' : 'Add Campaign Metrics'}
        </CardTitle>
        <CardDescription>
          {isEditMode ? 'Update existing campaign performance data' : 'Enter campaign performance data manually'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campaign Selector (Optional) */}
          <div>
            <Label htmlFor="campaign_id">Link to Campaign (Optional)</Label>
            <Select
              value={formData.campaign_id || 'manual'}
              onValueChange={(value) => {
                if (value === 'manual') {
                  setFormData(prev => ({ ...prev, campaign_id: undefined, campaign_name: '' }))
                } else {
                  const campaign = campaigns.find(c => c.id === value)
                  setFormData(prev => ({
                    ...prev,
                    campaign_id: value,
                    campaign_name: campaign?.name || ''
                  }))
                }
              }}
            >
              <SelectTrigger id="campaign_id" className="mt-2">
                <SelectValue placeholder="Select a campaign or enter manually" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry (no campaign link)</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Link metrics to an existing campaign or enter data manually
            </p>
          </div>

          {/* Campaign Name & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campaign_name">Campaign Name *</Label>
              <Input
                id="campaign_name"
                placeholder="e.g., Summer Sale 2025"
                value={formData.campaign_name}
                onChange={(e) => setFormData(prev => ({ ...prev, campaign_name: e.target.value }))}
                required
                disabled={!!formData.campaign_id}
                className="mt-2"
              />
              {formData.campaign_id && (
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-filled from selected campaign
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="metric_date">Date *</Label>
              <div className="relative mt-2">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="metric_date"
                  type="date"
                  value={formData.metric_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, metric_date: e.target.value }))}
                  required
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Basic Metrics - Always Visible */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Basic Metrics</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="spend">Spend * ($)</Label>
                <Input
                  id="spend"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.spend}
                  onChange={(e) => setFormData(prev => ({ ...prev, spend: e.target.value }))}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="conversions">Conversions</Label>
                <Input
                  id="conversions"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.conversions}
                  onChange={(e) => setFormData(prev => ({ ...prev, conversions: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="impressions">Impressions</Label>
                <Input
                  id="impressions"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.impressions}
                  onChange={(e) => setFormData(prev => ({ ...prev, impressions: e.target.value }))}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="clicks">Clicks</Label>
                <Input
                  id="clicks"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.clicks}
                  onChange={(e) => setFormData(prev => ({ ...prev, clicks: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Expandable Section: Revenue Tracking */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSections(prev => ({ ...prev, revenue: !prev.revenue }))}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900 dark:hover:to-emerald-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedSections.revenue ? (
                  <ChevronUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Revenue Tracking
                  </h3>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    E-commerce and direct revenue metrics
                  </p>
                </div>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                {expandedSections.revenue ? 'Collapse' : 'Add'}
              </span>
            </button>

            {expandedSections.revenue && (
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <Label htmlFor="revenue">Revenue ($)</Label>
                  <Input
                    id="revenue"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.revenue}
                    onChange={(e) => setFormData(prev => ({ ...prev, revenue: e.target.value }))}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Total revenue generated from this campaign
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Expandable Section: Lead Generation */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSections(prev => ({ ...prev, leadGen: !prev.leadGen }))}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900 dark:hover:to-amber-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedSections.leadGen ? (
                  <ChevronUp className="h-5 w-5 text-brand-gold dark:text-amber-400" />
                ) : (
                  <Plus className="h-5 w-5 text-brand-gold dark:text-amber-400" />
                )}
                <Users className="h-5 w-5 text-brand-gold dark:text-amber-400" />
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Lead Generation Metrics
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    B2B leads, calls, appointments, and conversions
                  </p>
                </div>
              </div>
              <span className="text-xs text-brand-gold dark:text-amber-400 font-medium">
                {expandedSections.leadGen ? 'Collapse' : 'Add'}
              </span>
            </button>

            {expandedSections.leadGen && (
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="leads">Total Leads</Label>
                    <Input
                      id="leads"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.leads}
                      onChange={(e) => setFormData(prev => ({ ...prev, leads: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="qualified_leads">Qualified Leads</Label>
                    <Input
                      id="qualified_leads"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.qualified_leads}
                      onChange={(e) => setFormData(prev => ({ ...prev, qualified_leads: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="calls">Calls</Label>
                    <Input
                      id="calls"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.calls}
                      onChange={(e) => setFormData(prev => ({ ...prev, calls: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="appointments">Appointments</Label>
                    <Input
                      id="appointments"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.appointments}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointments: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="form_fills">Form Fills</Label>
                    <Input
                      id="form_fills"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.form_fills}
                      onChange={(e) => setFormData(prev => ({ ...prev, form_fills: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="conversion_goal">Conversion Goal</Label>
                    <Select
                      value={formData.conversion_goal}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, conversion_goal: value }))}
                    >
                      <SelectTrigger id="conversion_goal" className="mt-2">
                        <SelectValue placeholder="Select conversion goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leads">Leads</SelectItem>
                        <SelectItem value="calls">Calls</SelectItem>
                        <SelectItem value="appointments">Appointments</SelectItem>
                        <SelectItem value="form_fills">Form Fills</SelectItem>
                        <SelectItem value="downloads">Downloads</SelectItem>
                        <SelectItem value="signups">Signups</SelectItem>
                        <SelectItem value="demo_requests">Demo Requests</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="conversion_value">Avg. Conversion Value ($)</Label>
                    <Input
                      id="conversion_value"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.conversion_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, conversion_value: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Expandable Section: Social Engagement */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSections(prev => ({ ...prev, social: !prev.social }))}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950 dark:to-rose-950 hover:from-pink-100 hover:to-rose-100 dark:hover:from-pink-900 dark:hover:to-rose-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedSections.social ? (
                  <ChevronUp className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                ) : (
                  <Plus className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                )}
                <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-pink-900 dark:text-pink-100">
                    Social Engagement Metrics
                  </h3>
                  <p className="text-xs text-pink-700 dark:text-pink-300">
                    Video views, likes, shares, comments, and followers
                  </p>
                </div>
              </div>
              <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                {expandedSections.social ? 'Collapse' : 'Add'}
              </span>
            </button>

            {expandedSections.social && (
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="video_views">Video Views</Label>
                    <Input
                      id="video_views"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.video_views}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_views: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="watch_time_seconds">Watch Time (seconds)</Label>
                    <Input
                      id="watch_time_seconds"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.watch_time_seconds}
                      onChange={(e) => setFormData(prev => ({ ...prev, watch_time_seconds: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="likes">Likes</Label>
                    <Input
                      id="likes"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.likes}
                      onChange={(e) => setFormData(prev => ({ ...prev, likes: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="shares">Shares</Label>
                    <Input
                      id="shares"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.shares}
                      onChange={(e) => setFormData(prev => ({ ...prev, shares: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="comments">Comments</Label>
                    <Input
                      id="comments"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.comments}
                      onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="saves">Saves</Label>
                    <Input
                      id="saves"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.saves}
                      onChange={(e) => setFormData(prev => ({ ...prev, saves: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="profile_visits">Profile Visits</Label>
                    <Input
                      id="profile_visits"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.profile_visits}
                      onChange={(e) => setFormData(prev => ({ ...prev, profile_visits: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="followers_gained">Followers Gained</Label>
                    <Input
                      id="followers_gained"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.followers_gained}
                      onChange={(e) => setFormData(prev => ({ ...prev, followers_gained: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Calculated Metrics Display */}
          {(calculatedMetrics.ctr > 0 || calculatedMetrics.cpc > 0 || calculatedMetrics.roi !== 0) && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-brand-gold dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Auto-Calculated Metrics</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {calculatedMetrics.ctr > 0 && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">CTR:</span>
                    <span className="ml-2 font-medium text-amber-700 dark:text-amber-300">{calculatedMetrics.ctr}%</span>
                  </div>
                )}
                {calculatedMetrics.cpc > 0 && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">CPC:</span>
                    <span className="ml-2 font-medium text-amber-700 dark:text-amber-300">${calculatedMetrics.cpc}</span>
                  </div>
                )}
                {formData.revenue && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">ROI:</span>
                    <span className={`ml-2 font-medium ${calculatedMetrics.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {calculatedMetrics.roi}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Source */}
          <div>
            <Label htmlFor="source">Data Source</Label>
            <Select
              value={formData.source}
              onValueChange={(value) => setFormData(prev => ({ ...prev, source: value as typeof formData.source }))}
            >
              <SelectTrigger id="source" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="google_ads">Google Ads</SelectItem>
                <SelectItem value="meta_ads">Meta Ads (Facebook/Instagram)</SelectItem>
                <SelectItem value="linkedin_ads">LinkedIn Ads</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional context or notes about this campaign performance..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Update Metrics' : 'Save Metrics'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
