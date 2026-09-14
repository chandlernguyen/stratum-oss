/**
 * CSV Upload with Campaign Mapping
 * Phase 2: Combines CSV parsing with fuzzy campaign matching
 * Date: 2025-10-16
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Upload, FileSpreadsheet, Download, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { CampaignMappingWizard } from './CampaignMappingWizard';
import { parseCSVFile, validateCampaignMetricsCSV, transformToCampaignMetrics, downloadCSVTemplate } from '@/lib/utils/csvParser';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import type { CampaignMetricRow } from '@/hooks/data/useCampaignMetrics';

interface CSVUploadWithCampaignMappingProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function CSVUploadWithCampaignMapping({ onComplete, onCancel }: CSVUploadWithCampaignMappingProps) {
  const { t } = useTranslation('campaigns');
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CampaignMetricRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const onDrop = async (acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0];
    if (!csvFile) return;

    // Reset errors
    setParseErrors([]);
    setValidationErrors([]);

    if (!csvFile.name.endsWith('.csv')) {
      setParseErrors([t('performance.upload.csvExtensionError')]);
      return;
    }

    try {
      setFile(csvFile);

      // Parse CSV
      const parsed = await parseCSVFile(csvFile);

      if (parsed.errors.length > 0) {
        setParseErrors(parsed.errors);
        return;
      }

      // Validate CSV structure
      const errors = validateCampaignMetricsCSV(parsed.data);

      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      // Transform to campaign metrics format
      const metrics = transformToCampaignMetrics(parsed.data);

      setCsvData(metrics);
      setCurrentStep('mapping');

      toast.success(t('performance.upload.loadedMetrics', { count: metrics.length, filename: csvFile.name }));
    } catch (error) {
      console.error('[CSVUploadWithCampaignMapping] Parse error:', error);
      setParseErrors([t('performance.upload.parseError')]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false
  });

  const handleImportComplete = () => {
    setCurrentStep('complete');
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setFile(null);
    setCsvData([]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-8 gap-4">
        {['upload', 'mapping', 'complete'].map((step, idx) => {
          const stepLabels = [
            t('performance.upload.steps.uploadCSV'),
            t('performance.upload.steps.mapCampaigns'),
            t('performance.upload.steps.complete')
          ];
          const isActive = currentStep === step;
          const isCompleted = ['upload', 'mapping'].indexOf(currentStep) > idx;

          return (
            <div key={step} className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    : isCompleted
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="font-semibold">{idx + 1}</span>
                )}
                <span className="text-sm font-medium">{stepLabels[idx]}</span>
              </div>
              {idx < 2 && (
                <div className={`h-1 w-12 ${isCompleted ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload CSV */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('performance.upload.title')}
            </CardTitle>
            <CardDescription>
              {t('performance.upload.description')}
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
                <p className="text-green-600 dark:text-green-400">{t('performance.upload.dropHere')}</p>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {t('performance.upload.dragDrop')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('performance.upload.requiredColumns')}
                  </p>
                </>
              )}
            </div>

            {file && !parseErrors.length && !validationErrors.length && (
              <div className="flex items-center gap-2">
                <Alert className="flex-1">
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('performance.upload.selectedFile')}:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParseErrors([]);
                    setValidationErrors([]);
                    toast.info(t('performance.upload.fileRemoved'));
                  }}
                  className="shrink-0"
                  title={t('performance.upload.removeFile')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Validation Error Display - Professional & Branded */}
            {(parseErrors.length > 0 || validationErrors.length > 0) && (
              <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl font-semibold text-amber-900 dark:text-amber-100">
                        {t('performance.upload.validationIssues')}
                      </CardTitle>
                      <CardDescription className="text-amber-700 dark:text-amber-300 mt-1">
                        {t('performance.upload.fixIssues')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Parse Errors Section */}
                  {parseErrors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {t('performance.upload.fileFormatErrors', { count: parseErrors.length })}
                        </h4>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800 divide-y divide-amber-100 dark:divide-amber-900">
                        {parseErrors.map((error, idx) => (
                          <div key={idx} className="px-4 py-3 flex items-start gap-3">
                            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validation Errors Section */}
                  {validationErrors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {t('performance.upload.dataValidationErrors', { count: validationErrors.length })}
                        </h4>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800 divide-y divide-amber-100 dark:divide-amber-900 max-h-64 overflow-y-auto">
                        {validationErrors.map((error, idx) => (
                          <div key={idx} className="px-4 py-3 flex items-start gap-3">
                            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Helpful Tips */}
                  <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <h5 className="font-medium text-slate-900 dark:text-slate-100">{t('performance.upload.howToFix.title')}</h5>
                        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5 leading-relaxed">
                          <li className="flex items-start gap-2">
                            <span className="text-slate-400">•</span>
                            <span>{t('performance.upload.howToFix.requiredColumns')}: <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono">campaign_name</code>, <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono">metric_date</code>, <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono">spend</code></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-slate-400">•</span>
                            <span>{t('performance.upload.howToFix.dateFormat')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-slate-400">•</span>
                            <span>{t('performance.upload.howToFix.numericFields')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-slate-400">•</span>
                            <span>{t('performance.upload.howToFix.downloadTemplate')}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setParseErrors([]);
                        setValidationErrors([]);
                      }}
                      className="flex-1"
                    >
                      {t('performance.upload.clearFile')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadCSVTemplate}
                      className="flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t('performance.upload.downloadTemplate')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!parseErrors.length && !validationErrors.length && (
              <Button variant="outline" onClick={downloadCSVTemplate} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {t('performance.upload.downloadCSVTemplate')}
              </Button>
            )}

            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="w-full">
                {t('common:buttons.cancel')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Campaign Mapping */}
      {currentStep === 'mapping' && csvData.length > 0 && (
        <CampaignMappingWizard
          csvData={csvData}
          onImportComplete={handleImportComplete}
          onCancel={() => setCurrentStep('upload')}
        />
      )}

      {/* Step 3: Complete */}
      {currentStep === 'complete' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <div>
              <h3 className="text-2xl font-bold text-green-600">{t('performance.upload.importSuccess')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {t('performance.upload.importSuccessDescription')}
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={handleReset} variant="outline">
                {t('performance.upload.importMore')}
              </Button>
              <Button onClick={onComplete}>
                {t('performance.upload.viewMetrics')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
