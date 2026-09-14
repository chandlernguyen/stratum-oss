import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Download,
  Table as TableIcon,
  HelpCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBulkImportCampaignMetrics, useCampaignMetrics, useDeleteAllCampaignMetrics, type CampaignMetric } from '@/hooks/data/useCampaignMetrics';
import { toast } from 'sonner';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { supabase } from '@/lib/supabase';

interface CSVUploadWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

interface ParsedRow {
  rowIndex: number;
  data: Record<string, string>;
  mapped: Partial<CampaignMetric>;
  errors: string[];
  duplicateOf?: {
    campaign_name: string;
    metric_date: string;
    source: string;
  };
  isValid: boolean;
  isDuplicate: boolean;
}

const REQUIRED_FIELDS = ['campaign_name', 'metric_date', 'spend'];

const OPTIONAL_FIELDS = [
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

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const FIELD_DESCRIPTIONS: Record<string, string> = {
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

const formatFieldName = (field: string): string => {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function CSVUploadWizard({ onComplete, onCancel }: CSVUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validRows, setValidRows] = useState<ParsedRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<ParsedRow[]>([]);
  const [duplicateRows, setDuplicateRows] = useState<ParsedRow[]>([]);
  const [showReplaceConfirmation, setShowReplaceConfirmation] = useState(false);
  const [existingMetricsCount, setExistingMetricsCount] = useState(0);

  const bulkImport = useBulkImportCampaignMetrics();
  const deleteAllMetrics = useDeleteAllCampaignMetrics();
  const { data: existingMetrics = [] } = useCampaignMetrics();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  // Fetch existing metrics count
  useEffect(() => {
    const fetchExistingMetricsCount = async () => {
      if (!orgId) return;

      const { count } = await supabase
        .from('campaign_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      setExistingMetricsCount(count || 0);
    };

    fetchExistingMetricsCount();
  }, [orgId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0];
    if (!csvFile) return;

    if (!csvFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(csvFile);
    parseCSV(csvFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false
  });

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('CSV file must have at least 2 rows (header + data)');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      setCsvHeaders(headers);

      // Parse rows
      const rows = lines.slice(1).map(line =>
        line.split(',').map(cell => cell.trim().replace(/"/g, ''))
      );
      setCsvRows(rows);

      // Auto-map columns (try to match by name)
      const autoMapping: Record<string, string> = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().replace(/\s+/g, '_');
        if (ALL_FIELDS.some(field => lowerHeader.includes(field.replace('_', '')))) {
          const matchedField = ALL_FIELDS.find(field =>
            lowerHeader.includes(field.replace('_', '')) ||
            field.includes(lowerHeader.replace('_', ''))
          );
          if (matchedField) {
            autoMapping[matchedField] = header;
          }
        }
      });
      setColumnMapping(autoMapping);

      setCurrentStep(2);
    };
    reader.readAsText(file);
  };

  const handleMapping = (dbField: string, csvColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [dbField]: csvColumn
    }));
  };

  const validateAndParseRows = () => {
    const parsed: ParsedRow[] = csvRows.map((row, index) => {
      const rowData: Record<string, string> = {};
      csvHeaders.forEach((header, i) => {
        rowData[header] = row[i] || '';
      });

      const mapped: any = {};
      const errors: string[] = [];

      // Map required fields
      REQUIRED_FIELDS.forEach(field => {
        const csvColumn = columnMapping[field];
        if (csvColumn && rowData[csvColumn]) {
          if (field === 'spend') {
            const value = parseFloat(rowData[csvColumn]);
            if (isNaN(value) || value < 0) {
              errors.push(
                `Spend must be a positive number. ` +
                `You entered: "${rowData[csvColumn]}" (example: 1500.00)`
              );
            } else {
              mapped.spend = value;
            }
          } else if (field === 'metric_date') {
            const dateValue = rowData[csvColumn];
            // Basic date validation
            if (!dateValue || !dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
              errors.push(
                `The date "${dateValue}" doesn't look right. ` +
                `Please use format YYYY-MM-DD (example: 2025-10-15)`
              );
            } else {
              mapped.metric_date = dateValue;
            }
          } else {
            mapped[field] = rowData[csvColumn];
          }
        } else {
          errors.push(
            `The required field "${field}" is missing. ` +
            `Please map a CSV column to this field.`
          );
        }
      });

      // Map optional fields
      OPTIONAL_FIELDS.forEach(field => {
        const csvColumn = columnMapping[field];
        if (csvColumn && rowData[csvColumn]) {
          const value = rowData[csvColumn];

          // Numeric fields (integers)
          if (['impressions', 'clicks', 'conversions', 'leads', 'calls', 'appointments',
               'video_views', 'likes', 'shares', 'comments', 'saves', 'profile_visits'].includes(field)) {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0) {
              mapped[field] = numValue;
            }
          }
          // Numeric fields (decimals)
          else if (['revenue'].includes(field)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue >= 0) {
              mapped[field] = numValue;
            }
          }
          // Enum fields
          else if (field === 'source') {
            if (['google_ads', 'meta_ads', 'linkedin_ads', 'manual', 'other'].includes(value)) {
              mapped.source = value as any;
            }
          }
          else if (field === 'conversion_goal') {
            if (['revenue', 'leads', 'calls', 'appointments', 'form_fills', 'downloads', 'signups', 'demo_requests', 'other'].includes(value)) {
              mapped.conversion_goal = value as any;
            }
          }
          // Text fields (notes)
          else {
            mapped[field] = value;
          }
        }
      });

      return {
        rowIndex: index + 2, // +2 for header row and 0-indexing
        data: rowData,
        mapped,
        errors,
        isValid: errors.length === 0,
        isDuplicate: false
      };
    });

    // Check for duplicates against existing data
    parsed.forEach(row => {
      if (!row.isValid) return; // Skip rows with validation errors

      const duplicate = existingMetrics.find(existing =>
        existing.campaign_name === row.mapped.campaign_name &&
        existing.metric_date === row.mapped.metric_date &&
        existing.source === row.mapped.source
      );

      if (duplicate) {
        row.isDuplicate = true;
        row.duplicateOf = {
          campaign_name: duplicate.campaign_name,
          metric_date: duplicate.metric_date,
          source: duplicate.source || 'unknown'
        };
      }
    });

    setValidRows(parsed.filter(r => r.isValid && !r.isDuplicate));
    setDuplicateRows(parsed.filter(r => r.isDuplicate));
    setInvalidRows(parsed.filter(r => !r.isValid));
    setCurrentStep(3);
  };

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setCurrentStep(5); // Processing step

    try {
      const metricsToImport = validRows.map(row => row.mapped as Omit<CampaignMetric, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>);
      const result = await bulkImport.mutateAsync(metricsToImport);

      // Store actual imported count for success message
      setValidRows(prev => prev.slice(0, result.length)); // Update to match actual imported count

      setCurrentStep(6); // Success step
    } catch (error) {
      toast.error('Failed to import metrics');
      setCurrentStep(4); // Back to review step
    }
  };

  const handleReplaceAll = async () => {
    try {
      // Step 1: Delete all existing metrics
      await deleteAllMetrics.mutateAsync();

      // Step 2: Import new data (including duplicates since DB is now empty)
      const allRows = [...validRows, ...duplicateRows];
      const metricsToImport = allRows.map(row => row.mapped as Omit<CampaignMetric, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>);
      await bulkImport.mutateAsync(metricsToImport);

      setShowReplaceConfirmation(false);
      setCurrentStep(6); // Success
    } catch (error) {
      toast.error('Failed to replace data');
      setShowReplaceConfirmation(false);
      setCurrentStep(4); // Back to review
    }
  };

  const downloadTemplate = () => {
    const headers = [
      // REQUIRED
      'campaign_name',
      'metric_date',
      'spend',

      // OPTIONAL - Conversion Metrics
      'revenue',
      'impressions',
      'clicks',
      'conversions',
      'leads',
      'calls',
      'appointments',
      'conversion_goal',

      // OPTIONAL - Engagement Metrics (Phase 6.5)
      'video_views',
      'likes',
      'shares',
      'comments',
      'saves',
      'profile_visits',

      // OPTIONAL - Source
      'source',
      'notes'
    ];

    // Example 1: E-commerce with revenue tracking
    const example1 = [
      'Summer Sale 2025',           // campaign_name
      '2025-10-01',                 // metric_date
      '1500.00',                    // spend
      '4500.00',                    // revenue
      '50000',                      // impressions
      '2500',                       // clicks
      '150',                        // conversions
      '',                           // leads
      '',                           // calls
      '',                           // appointments
      'revenue',                    // conversion_goal
      '',                           // video_views
      '',                           // likes
      '',                           // shares
      '',                           // comments
      '',                           // saves
      '',                           // profile_visits
      'google_ads',                 // source
      'Strong search performance'   // notes
    ];

    // Example 2: Social media with engagement tracking
    const example2 = [
      'Instagram Reel Campaign',
      '2025-10-02',
      '800.00',
      '',         // revenue (not tracked yet)
      '150000',   // impressions
      '',         // clicks (not applicable)
      '',         // conversions
      '45',       // leads (from DMs)
      '',         // calls
      '',         // appointments
      'leads',    // conversion_goal
      '50000',    // video_views
      '2500',     // likes
      '180',      // shares
      '320',      // comments
      '450',      // saves
      '890',      // profile_visits
      'meta_ads',
      'Viral reel drove profile visits and DMs'
    ];

    // Example 3: B2B lead generation
    const example3 = [
      'LinkedIn Webinar Promo',
      '2025-10-03',
      '600.00',
      '',         // revenue
      '20000',    // impressions
      '1000',     // clicks
      '150',      // conversions
      '150',      // leads (webinar signups)
      '45',       // calls (from leads)
      '12',       // appointments (demos booked)
      'appointments', // conversion_goal
      '',         // video_views
      '85',       // likes
      '22',       // shares
      '18',       // comments
      '',         // saves
      '',         // profile_visits
      'linkedin_ads',
      'High-quality B2B leads, senior decision makers'
    ];

    // Instructions row
    const instructions = [
      '# INSTRUCTIONS: Delete this row before uploading',
      'Format: YYYY-MM-DD (e.g., 2025-10-15)',
      'Numbers only, decimals OK',
      'For e-commerce campaigns',
      'How many times ad was shown',
      'Clicks on your ad',
      'Purchases/signups/downloads',
      'For B2B or lead-gen campaigns',
      'Phone calls received',
      'Appointments/demos booked',
      'revenue OR leads/calls/appointments',
      'For video ads (Instagram, TikTok, YouTube)',
      'Social engagement',
      'Shares/reposts (viral potential)',
      'Comments (engagement depth)',
      'Saves/bookmarks (strong intent)',
      'Profile visits (consideration)',
      'google_ads, meta_ads, linkedin_ads, manual, other',
      'Optional campaign notes'
    ];

    const csv = [
      instructions.join(','),
      headers.join(','),
      example1.join(','),
      example2.join(','),
      example3.join(',')
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign_metrics_template_with_examples.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Template downloaded! See 3 example rows for different campaign types.');
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({});
    setValidRows([]);
    setInvalidRows([]);
    setDuplicateRows([]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {['Upload', 'Map', 'Review', 'Confirm', 'Process', 'Complete'].map((_, idx) => {
          const step = idx + 1;
          return (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentStep >= step
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700'
                }`}
              >
                {currentStep > step ? <CheckCircle2 className="h-5 w-5" /> : step}
              </div>
              {step < 6 && (
                <div
                  className={`flex-1 h-1 mx-2 transition-colors ${
                    currentStep > step ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: File Upload */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Upload a CSV file containing campaign performance data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : 'border-gray-300 dark:border-gray-700 hover:border-green-500'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-brand-success dark:text-green-400">Drop the CSV file here...</p>
              ) : (
                <>
                  <p className="text-brand-slate dark:text-gray-400 mb-2">
                    Drag and drop a CSV file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Maximum file size: 5MB
                  </p>
                </>
              )}
            </div>

            {file && (
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  <strong>Selected file:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </AlertDescription>
              </Alert>
            )}

            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              Map CSV Columns
            </CardTitle>
            <CardDescription>
              Match your CSV columns to database fields. Required fields are marked with *
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TooltipProvider>
              {/* Required Fields */}
              <div>
                <h3 className="text-sm font-semibold text-brand-charcoal dark:text-gray-300 mb-3">
                  Required Fields
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {REQUIRED_FIELDS.map(field => (
                    <div key={field}>
                      <Label htmlFor={field} className="flex items-center gap-2">
                        {formatFieldName(field)}
                        <span className="text-brand-error">*</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex" aria-label={`Help for ${formatFieldName(field)}`}>
                              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{FIELD_DESCRIPTIONS[field]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(value) => handleMapping(field, value)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          {csvHeaders.map(header => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversion Metrics */}
              <div>
                <h3 className="text-sm font-semibold text-brand-charcoal dark:text-gray-300 mb-3">
                  Conversion Metrics (Optional)
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  For e-commerce or B2B campaigns tracking revenue, leads, calls, or appointments
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {['revenue', 'impressions', 'clicks', 'conversions', 'leads', 'calls', 'appointments', 'conversion_goal'].map(field => (
                    <div key={field}>
                      <Label htmlFor={field} className="flex items-center gap-2">
                        {formatFieldName(field)}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex" aria-label={`Help for ${formatFieldName(field)}`}>
                              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{FIELD_DESCRIPTIONS[field]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(value) => handleMapping(field, value)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Skip (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">Skip this field</SelectItem>
                          {csvHeaders.map(header => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engagement Metrics */}
              <div>
                <h3 className="text-sm font-semibold text-brand-charcoal dark:text-gray-300 mb-3">
                  Engagement Metrics (Optional - Phase 6.5)
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  For social media and video campaigns (Instagram, TikTok, YouTube, LinkedIn)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {['video_views', 'likes', 'shares', 'comments', 'saves', 'profile_visits'].map(field => (
                    <div key={field}>
                      <Label htmlFor={field} className="flex items-center gap-2">
                        {formatFieldName(field)}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex" aria-label={`Help for ${formatFieldName(field)}`}>
                              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{FIELD_DESCRIPTIONS[field]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(value) => handleMapping(field, value)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Skip (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">Skip this field</SelectItem>
                          {csvHeaders.map(header => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source & Notes */}
              <div>
                <h3 className="text-sm font-semibold text-brand-charcoal dark:text-gray-300 mb-3">
                  Source & Notes (Optional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {['source', 'notes'].map(field => (
                    <div key={field}>
                      <Label htmlFor={field} className="flex items-center gap-2">
                        {formatFieldName(field)}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex" aria-label={`Help for ${formatFieldName(field)}`}>
                              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{FIELD_DESCRIPTIONS[field]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(value) => handleMapping(field, value)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Skip (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">Skip this field</SelectItem>
                          {csvHeaders.map(header => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipProvider>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Found {csvRows.length} rows in CSV file. Required fields: campaign_name, metric_date, spend
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Step 3 & 4: Preview & Review */}
      {(currentStep === 3 || currentStep === 4) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Review Data
            </CardTitle>
            <CardDescription>
              Validate imported data before processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default" className="bg-green-600">
                ✓ {validRows.length} New Rows
              </Badge>
              {duplicateRows.length > 0 && (
                <Badge className="bg-yellow-600">
                  ⚠ {duplicateRows.length} Duplicates
                </Badge>
              )}
              {invalidRows.length > 0 && (
                <Badge variant="destructive">
                  ✗ {invalidRows.length} Invalid Rows
                </Badge>
              )}
            </div>

            {duplicateRows.length > 0 && (
              <Alert className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950">
                <AlertTriangle className="h-4 w-4 text-brand-warning" />
                <AlertDescription>
                  <strong className="text-brand-warning dark:text-yellow-200">{duplicateRows.length} rows already exist in your database:</strong>
                  <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {duplicateRows.slice(0, 10).map(row => (
                      <li key={row.rowIndex} className="text-sm text-brand-warning dark:text-yellow-300">
                        Row {row.rowIndex}: <strong>{row.duplicateOf?.campaign_name}</strong> on{' '}
                        {row.duplicateOf?.metric_date} ({row.duplicateOf?.source})
                      </li>
                    ))}
                    {duplicateRows.length > 10 && (
                      <li className="text-sm font-medium text-brand-warning dark:text-yellow-300">
                        ... and {duplicateRows.length - 10} more
                      </li>
                    )}
                  </ul>
                  <p className="mt-3 text-sm text-brand-warning dark:text-yellow-300">
                    💡 These rows will be skipped during import. Only {validRows.length} new rows will be imported.
                  </p>
                  <div className="mt-4 pt-3 border-t border-yellow-300 dark:border-yellow-700">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowReplaceConfirmation(true)}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Delete All Existing Data & Replace
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {invalidRows.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{invalidRows.length} rows have formatting errors:</strong>
                  <ul className="mt-2 space-y-1">
                    {invalidRows.slice(0, 5).map(row => (
                      <li key={row.rowIndex} className="text-sm">
                        <strong>Row {row.rowIndex}:</strong>
                        <ul className="ml-4 mt-1">
                          {row.errors.map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                    {invalidRows.length > 5 && (
                      <li className="text-sm">... and {invalidRows.length - 5} more rows with errors</li>
                    )}
                  </ul>
                  <p className="mt-2 text-sm">
                    💡 <strong>Tip:</strong> Download the template to see the correct format
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 font-medium text-sm">
                Valid Rows Preview (showing first 10)
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left">Campaign</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-right">Spend</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                      <th className="px-4 py-2 text-left">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.slice(0, 10).map(row => (
                      <tr key={row.rowIndex} className="border-t dark:border-gray-700">
                        <td className="px-4 py-2">{row.mapped.campaign_name}</td>
                        <td className="px-4 py-2">{row.mapped.metric_date}</td>
                        <td className="px-4 py-2 text-right">${row.mapped.spend?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">${row.mapped.revenue?.toFixed(2) || '—'}</td>
                        <td className="px-4 py-2">{row.mapped.source || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Processing */}
      {currentStep === 5 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium">Importing {validRows.length} metrics...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Success */}
      {currentStep === 6 && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-brand-success mx-auto" />
            <div>
              <h3 className="text-2xl font-bold text-brand-success">Import Successful!</h3>
              <p className="text-brand-slate dark:text-gray-400 mt-2">
                Successfully imported {validRows.length} campaign metrics
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={resetWizard} variant="outline">
                Import More
              </Button>
              <Button onClick={onComplete}>
                View Metrics
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {currentStep > 1 && currentStep < 5 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep === 2 && (
            <Button
              onClick={validateAndParseRows}
              disabled={!REQUIRED_FIELDS.every(field => columnMapping[field])}
            >
              Next: Preview Data
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {(currentStep === 3 || currentStep === 4) && (
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || bulkImport.isPending}
            >
              Import {validRows.length} Metrics
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {currentStep === 1 && onCancel && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}

      {/* Replace All Confirmation Dialog */}
      <AlertDialog open={showReplaceConfirmation} onOpenChange={setShowReplaceConfirmation}>
        <AlertDialogContent className="max-w-full sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-brand-error">
              <AlertTriangle className="h-5 w-5" />
              Delete All Existing Data?
            </AlertDialogTitle>
            <div className="space-y-4 pt-4">
              <div className="bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-900 dark:text-red-100 font-semibold text-lg">
                  ⚠️ This action CANNOT be undone!
                </p>
              </div>

              <div className="space-y-2 text-base text-brand-charcoal dark:text-gray-300">
                <p>You are about to:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>
                    <strong className="text-brand-error dark:text-red-400">Delete {existingMetricsCount} existing metrics</strong> from your database
                  </li>
                  <li>
                    <strong className="text-brand-success dark:text-green-400">Import {validRows.length + duplicateRows.length} new metrics</strong> from your CSV file
                  </li>
                </ul>
              </div>

              <Alert className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950">
                <AlertTriangle className="h-4 w-4 text-brand-warning" />
                <AlertDescription className="text-brand-warning dark:text-yellow-200">
                  <strong>Recommended:</strong> Consider using "Skip Duplicates" instead, which will:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Keep your existing {existingMetricsCount} metrics safe</li>
                    <li>Import only {validRows.length} new rows</li>
                    <li>Skip {duplicateRows.length} duplicate rows</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <p className="text-sm text-brand-slate dark:text-gray-400">
                Only proceed if you're absolutely certain you want to replace all existing data.
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReplaceAll}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete All & Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
