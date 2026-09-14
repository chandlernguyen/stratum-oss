import { useEffect, useState } from 'react';
import { useOrganization } from '@/hooks/data/useOrganization';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';
import {
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  Activity,
  Eye,
  MessageSquare,
  FileText
} from 'lucide-react';

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  roi: number;
}

export function GuestPortal() {
  const { locale } = useLocale();
  const intlLocale = getIntlLocale(locale);
  const { organization } = useOrganization();
  const { userRoles } = useUserRoles();
  const { data: whiteLabel } = useWhiteLabel();

  // Temporarily set currentClient to null - will be handled by URL routing later
  const currentClient: any = null;

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is a guest
  const isGuest = userRoles.some((role: any) =>
    ['guest', 'client_viewer'].includes(role.role.toLowerCase())
  );

  // Apply white-label brand kit CSS variables
  useEffect(() => {
    if (whiteLabel?.brandKit) {
      const root = document.documentElement;

      // Apply brand colors
      if (whiteLabel.brandKit.primary_color) {
        root.style.setProperty('--brand-primary', whiteLabel.brandKit.primary_color);
      }
      if (whiteLabel.brandKit.secondary_color) {
        root.style.setProperty('--brand-secondary', whiteLabel.brandKit.secondary_color);
      }
      if (whiteLabel.brandKit.accent_color) {
        root.style.setProperty('--brand-accent', whiteLabel.brandKit.accent_color);
      }

      // Apply brand font
      if (whiteLabel.brandKit.font_family) {
        root.style.setProperty('--brand-font', whiteLabel.brandKit.font_family);
        document.body.style.fontFamily = whiteLabel.brandKit.font_family;
      }
    }

    // Cleanup function to restore defaults
    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-secondary');
      root.style.removeProperty('--brand-accent');
      root.style.removeProperty('--brand-font');
      document.body.style.fontFamily = '';
    };
  }, [whiteLabel]);

  useEffect(() => {
    if (currentClient?.id) {
      loadGuestData();
    }
  }, [currentClient?.id]);

  const loadGuestData = async () => {
    try {
      setLoading(true);
      
      // Load campaigns for this client
      const campaignsResponse = await api.get('/api/v1/campaigns', {
        params: { client_id: currentClient?.id }
      });
      // Handle StandardResponse format - extract the actual data array
      const campaignsData = campaignsResponse.data.data || campaignsResponse.data;
      const campaignsList = Array.isArray(campaignsData) ? campaignsData : [];
      setCampaigns(campaignsList);

      // Load aggregated metrics
      const metricsResponse = await api.get(`/api/v1/clients/${currentClient?.id}/metrics`);
      // Handle StandardResponse format
      const metricsData = metricsResponse.data.data || metricsResponse.data;
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load guest data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isGuest) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              This portal is only available for guest users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* White-label header with brand colors */}
      <header
        className="border-b-2"
        style={{
          backgroundColor: whiteLabel?.brandKit?.primary_color || 'var(--brand-primary, #3B82F6)',
        }}
      >
        <div className="container mx-auto px-4 py-4">
          {whiteLabel?.brandKit?.logo_url ? (
            <img
              src={whiteLabel.brandKit.logo_url}
              alt={whiteLabel.clientName}
              className="h-8"
            />
          ) : (
            <h1 className="text-2xl font-bold text-white">
              {whiteLabel?.clientName || currentClient?.name || organization?.name}
            </h1>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Portal Content Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Campaign Performance</h2>
              <p className="text-muted-foreground mt-1">
                Welcome to your marketing dashboard
              </p>
            </div>
            <Badge variant="secondary" className="h-8 px-3">
              <Eye className="w-4 h-4 mr-1" />
              View-Only Access
            </Badge>
          </div>
        </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Spend</p>
                  <p className="text-2xl font-bold">${metrics.spend.toLocaleString(intlLocale)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Impressions</p>
                  <p className="text-2xl font-bold">{metrics.impressions.toLocaleString(intlLocale)}</p>
                </div>
                <Eye className="w-8 h-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                  <p className="text-2xl font-bold">{metrics.conversions.toLocaleString(intlLocale)}</p>
                </div>
                <Target className="w-8 h-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ROI</p>
                  <p className="text-2xl font-bold">{metrics.roi.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaigns Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active Campaigns</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid gap-4">
            {campaigns.filter(c => c.status === 'active').map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge variant="default">
                      <Activity className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Campaign Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Budget Used</span>
                        <span className="font-medium">
                          ${campaign.spent?.toLocaleString(intlLocale) || 0} / ${campaign.budget?.toLocaleString(intlLocale) || 0}
                        </span>
                      </div>
                      <Progress 
                        value={(campaign.spent / campaign.budget) * 100 || 0} 
                        className="h-2"
                      />
                    </div>

                    {/* Campaign Dates */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Start:</span>
                        <span>{new Date(campaign.start_date).toLocaleDateString(intlLocale)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">End:</span>
                        <span>{new Date(campaign.end_date).toLocaleDateString(intlLocale)}</span>
                      </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="text-center">
                        <p className="text-2xl font-semibold">{campaign.metrics?.impressions || 0}</p>
                        <p className="text-xs text-muted-foreground">Impressions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold">{campaign.metrics?.clicks || 0}</p>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold">{campaign.metrics?.conversions || 0}</p>
                        <p className="text-xs text-muted-foreground">Conversions</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {campaigns.filter(c => c.status === 'active').length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">No active campaigns at the moment.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Campaign Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Monthly Performance Report</p>
                      <p className="text-sm text-muted-foreground">November 2024</p>
                    </div>
                  </div>
                  <Badge variant="outline">PDF</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Campaign Analytics Summary</p>
                      <p className="text-sm text-muted-foreground">Q4 2024</p>
                    </div>
                  </div>
                  <Badge variant="outline">PDF</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Updates from Your Account Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-medium">Campaign Optimization Update</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We've optimized your targeting parameters based on last week's performance data. 
                    Expecting to see a 15% improvement in CTR.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">2 days ago</p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="font-medium">Milestone Achieved!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your campaign has reached 10,000 conversions! Great job on the landing page improvements.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">1 week ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
