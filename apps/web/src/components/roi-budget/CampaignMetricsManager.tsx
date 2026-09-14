import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table as TableIcon,
  MoreVertical,
  Edit,
  Trash2,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Columns,
  Check
} from 'lucide-react';
import { useCampaignMetrics, useDeleteCampaignMetric, useCampaignMetricsSummary, type CampaignMetric } from '@/hooks/data/useCampaignMetrics';
import { CampaignDataEntryForm } from './CampaignDataEntryForm';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

interface CampaignMetricsManagerProps {
  defaultCampaignName?: string;
}

// Column visibility configuration
interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
}

const COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'campaign', label: 'Campaign', defaultVisible: true },
  { id: 'date', label: 'Date', defaultVisible: true },
  { id: 'spend', label: 'Spend', defaultVisible: true },
  { id: 'revenue', label: 'Revenue', defaultVisible: true },
  { id: 'roi', label: 'ROI', defaultVisible: true },
  { id: 'impressions', label: 'Impressions', defaultVisible: false },
  { id: 'clicks', label: 'Clicks', defaultVisible: false },
  { id: 'ctr', label: 'CTR', defaultVisible: false },
  { id: 'conversions', label: 'Conversions', defaultVisible: false },
  { id: 'video_views', label: 'Video Views', defaultVisible: false },
  { id: 'likes', label: 'Likes', defaultVisible: false },
  { id: 'shares', label: 'Shares', defaultVisible: false },
  { id: 'comments', label: 'Comments', defaultVisible: false },
  { id: 'saves', label: 'Saves', defaultVisible: false },
  { id: 'profile_visits', label: 'Profile Visits', defaultVisible: false },
  { id: 'source', label: 'Source', defaultVisible: true },
];

export function CampaignMetricsManager({ defaultCampaignName }: CampaignMetricsManagerProps) {
  const { locale } = useLocale();
  const intlLocale = getIntlLocale(locale);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingMetric, setEditingMetric] = useState<CampaignMetric | null>(null);
  const [deletingMetric, setDeletingMetric] = useState<CampaignMetric | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Column visibility state (SME-friendly defaults)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const defaults = new Set<string>();
    COLUMN_CONFIG.forEach(col => {
      if (col.defaultVisible) defaults.add(col.id);
    });
    return defaults;
  });

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  const showAllColumns = () => {
    setVisibleColumns(new Set(COLUMN_CONFIG.map(c => c.id)));
  };

  const resetColumns = () => {
    const defaults = new Set<string>();
    COLUMN_CONFIG.forEach(col => {
      if (col.defaultVisible) defaults.add(col.id);
    });
    setVisibleColumns(defaults);
  };

  // Fetch metrics with filters
  const { data: metrics = [], isLoading, error } = useCampaignMetrics({
    campaignName: defaultCampaignName,
    source: sourceFilter === 'all' ? undefined : sourceFilter as any,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Fetch summary
  const { data: summary } = useCampaignMetricsSummary(
    startDate || undefined,
    endDate || undefined
  );

  const deleteMetric = useDeleteCampaignMetric();

  // Filter metrics by search term
  const filteredMetrics = useMemo(() => {
    if (!searchTerm) return metrics;
    return metrics.filter(metric =>
      metric.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [metrics, searchTerm]);

  const handleEdit = (metric: CampaignMetric) => {
    setEditingMetric(metric);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (metric: CampaignMetric) => {
    setDeletingMetric(metric);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingMetric) return;
    await deleteMetric.mutateAsync({ id: deletingMetric.id });
    setIsDeleteDialogOpen(false);
    setDeletingMetric(null);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingMetric(null);
  };

  const calculateROI = (spend: number, revenue?: number) => {
    if (!revenue || spend === 0) return null;
    return ((revenue - spend) / spend) * 100;
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '—';
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value?: number) => {
    if (value === undefined || value === null) return '—';
    return value.toLocaleString(intlLocale);
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null) return '—';
    return `${value.toFixed(2)}%`;
  };

  const getSourceBadgeColor = (source?: string) => {
    switch (source) {
      case 'google_ads': return 'bg-blue-100 text-brand-info dark:bg-blue-900 dark:text-blue-200';
      case 'meta_ads': return 'bg-slate-100 text-brand-charcoal dark:bg-slate-900 dark:text-slate-200';
      case 'linkedin_ads': return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200';
      case 'manual': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-slate dark:text-gray-400">Total Spend</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_spend)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-brand-error" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-slate dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_revenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-brand-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-slate dark:text-gray-400">Average ROI</p>
                  <p className={`text-2xl font-bold ${summary.avg_roi >= 0 ? 'text-brand-success' : 'text-brand-error'}`}>
                    {formatPercentage(summary.avg_roi)}
                  </p>
                </div>
                <TrendingUp className={`h-8 w-8 ${summary.avg_roi >= 0 ? 'text-brand-success' : 'text-brand-error'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-slate dark:text-gray-400">Campaigns Tracked</p>
                  <p className="text-2xl font-bold">{summary.total_campaigns}</p>
                </div>
                <TableIcon className="h-8 w-8 text-brand-info" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Campaign</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="source">Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="meta_ads">Meta Ads</SelectItem>
                  <SelectItem value="linkedin_ads">LinkedIn Ads</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          {(searchTerm || sourceFilter !== 'all' || startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSourceFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                Campaign Metrics ({filteredMetrics.length})
              </CardTitle>
              <CardDescription>
                View, edit, and manage campaign performance data
              </CardDescription>
            </div>

            {/* Column Visibility Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold">Toggle Columns</div>
                <DropdownMenuSeparator />
                {COLUMN_CONFIG.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    onClick={() => toggleColumn(column.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span>{column.label}</span>
                    {visibleColumns.has(column.id) && (
                      <Check className="h-4 w-4 text-brand-success" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={showAllColumns}>
                  Show All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={resetColumns}>
                  Reset to Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load campaign metrics. Please try again.</AlertDescription>
            </Alert>
          ) : filteredMetrics.length === 0 ? (
            <div className="text-center py-8 text-brand-slate dark:text-gray-400">
              <TableIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No campaign metrics found</p>
              <p className="text-sm">Try adjusting your filters or add new metrics</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.has('campaign') && <TableHead>Campaign</TableHead>}
                    {visibleColumns.has('date') && <TableHead>Date</TableHead>}
                    {visibleColumns.has('spend') && <TableHead className="text-right">Spend</TableHead>}
                    {visibleColumns.has('revenue') && <TableHead className="text-right">Revenue</TableHead>}
                    {visibleColumns.has('roi') && <TableHead className="text-right">ROI</TableHead>}
                    {visibleColumns.has('impressions') && <TableHead className="text-right">Impressions</TableHead>}
                    {visibleColumns.has('clicks') && <TableHead className="text-right">Clicks</TableHead>}
                    {visibleColumns.has('ctr') && <TableHead className="text-right">CTR</TableHead>}
                    {visibleColumns.has('conversions') && <TableHead className="text-right">Conversions</TableHead>}
                    {visibleColumns.has('video_views') && <TableHead className="text-right">Video Views</TableHead>}
                    {visibleColumns.has('likes') && <TableHead className="text-right">Likes</TableHead>}
                    {visibleColumns.has('shares') && <TableHead className="text-right">Shares</TableHead>}
                    {visibleColumns.has('comments') && <TableHead className="text-right">Comments</TableHead>}
                    {visibleColumns.has('saves') && <TableHead className="text-right">Saves</TableHead>}
                    {visibleColumns.has('profile_visits') && <TableHead className="text-right">Profile Visits</TableHead>}
                    {visibleColumns.has('source') && <TableHead>Source</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetrics.map((metric) => {
                    const roi = calculateROI(metric.spend, metric.revenue);
                    return (
                      <TableRow key={metric.id}>
                        {visibleColumns.has('campaign') && (
                          <TableCell className="font-medium">{metric.campaign_name}</TableCell>
                        )}
                        {visibleColumns.has('date') && (
                          <TableCell>{new Date(metric.metric_date).toLocaleDateString(intlLocale)}</TableCell>
                        )}
                        {visibleColumns.has('spend') && (
                          <TableCell className="text-right">{formatCurrency(metric.spend)}</TableCell>
                        )}
                        {visibleColumns.has('revenue') && (
                          <TableCell className="text-right">{formatCurrency(metric.revenue)}</TableCell>
                        )}
                        {visibleColumns.has('roi') && (
                          <TableCell className="text-right">
                            {roi !== null ? (
                              <span className={roi >= 0 ? 'text-brand-success dark:text-green-400' : 'text-brand-error dark:text-red-400'}>
                                {formatPercentage(roi)}
                              </span>
                            ) : '—'}
                          </TableCell>
                        )}
                        {visibleColumns.has('impressions') && (
                          <TableCell className="text-right">{formatNumber(metric.impressions)}</TableCell>
                        )}
                        {visibleColumns.has('clicks') && (
                          <TableCell className="text-right">{formatNumber(metric.clicks)}</TableCell>
                        )}
                        {visibleColumns.has('ctr') && (
                          <TableCell className="text-right">{formatPercentage(metric.ctr)}</TableCell>
                        )}
                        {visibleColumns.has('conversions') && (
                          <TableCell className="text-right">{formatNumber(metric.conversions)}</TableCell>
                        )}
                        {visibleColumns.has('video_views') && (
                          <TableCell className="text-right">{formatNumber(metric.video_views)}</TableCell>
                        )}
                        {visibleColumns.has('likes') && (
                          <TableCell className="text-right">{formatNumber(metric.likes)}</TableCell>
                        )}
                        {visibleColumns.has('shares') && (
                          <TableCell className="text-right">{formatNumber(metric.shares)}</TableCell>
                        )}
                        {visibleColumns.has('comments') && (
                          <TableCell className="text-right">{formatNumber(metric.comments)}</TableCell>
                        )}
                        {visibleColumns.has('saves') && (
                          <TableCell className="text-right">{formatNumber(metric.saves)}</TableCell>
                        )}
                        {visibleColumns.has('profile_visits') && (
                          <TableCell className="text-right">{formatNumber(metric.profile_visits)}</TableCell>
                        )}
                        {visibleColumns.has('source') && (
                          <TableCell>
                            <Badge className={getSourceBadgeColor(metric.source)}>
                              {metric.source?.replace('_', ' ') || 'manual'}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(metric)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(metric)}
                                className="text-brand-error dark:text-red-400"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign Metric</DialogTitle>
            <DialogDescription>
              Update campaign performance data
            </DialogDescription>
          </DialogHeader>
          {editingMetric && (
            <CampaignDataEntryForm
              initialData={editingMetric}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign Metric</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this metric? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingMetric && (
            <div className="py-4">
              <p className="text-sm">
                <strong>Campaign:</strong> {deletingMetric.campaign_name}
              </p>
              <p className="text-sm">
                <strong>Date:</strong> {new Date(deletingMetric.metric_date).toLocaleDateString(intlLocale)}
              </p>
              <p className="text-sm">
                <strong>Spend:</strong> {formatCurrency(deletingMetric.spend)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMetric.isPending}
            >
              {deleteMetric.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
