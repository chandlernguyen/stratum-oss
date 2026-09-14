import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus, X, FileText, Loader2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// Supported file types
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
};
const MAX_FILE_SIZE_MB = 50;

// Using snake_case to match backend API expectations (consistent with session_id, user_id, etc.)
export type UploadedFile = {
  gemini_uri: string;
  gemini_name: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  expires_at: string;
};

interface FileUploadButtonProps {
  agentType: string;
  onFileUploaded: (file: UploadedFile) => void;
  onFileRemoved: (geminiUri: string) => void;
  uploadedFiles: UploadedFile[];
  disabled?: boolean;
  className?: string;
}

export function FileUploadButton({
  agentType,
  onFileUploaded,
  onFileRemoved,
  uploadedFiles,
  disabled = false,
  className,
}: FileUploadButtonProps) {
  const { t } = useTranslation(['agents', 'common']);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useResponsive();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input for re-selection of same file
    e.target.value = '';

    // Validate file type
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)) {
      setError(t('agents:fileUpload.errors.unsupportedType'));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(t('agents:fileUpload.errors.fileTooLarge', { maxSize: MAX_FILE_SIZE_MB }));
      return;
    }

    setError(null);
    setIsUploading(true);
    setIsOpen(false); // Close the menu when upload starts

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(
        `/api/v1/direct-agents/${agentType}/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.data.success && response.data.file) {
        const uploadedFile: UploadedFile = {
          gemini_uri: response.data.file.gemini_uri,
          gemini_name: response.data.file.gemini_name,
          original_filename: response.data.file.original_filename,
          mime_type: response.data.file.mime_type,
          size_bytes: response.data.file.size_bytes,
          uploaded_at: response.data.file.uploaded_at,
          expires_at: response.data.file.expires_at,
        };
        onFileUploaded(uploadedFile);
      } else {
        setError(response.data.error || 'Upload failed');
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to upload file';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Hidden file input
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,.txt"
      onChange={handleFileSelect}
      className="hidden"
      disabled={disabled || isUploading}
    />
  );

  // Menu content for both desktop popover and mobile sheet
  const menuContent = (
    <div className="space-y-1">
      <button
        type="button"
        onClick={triggerFileInput}
        disabled={disabled || isUploading}
        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
      >
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{t('agents:fileUpload.attachFiles')}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('agents:fileUpload.fileTypeHint', { maxSize: MAX_FILE_SIZE_MB })}</div>
        </div>
      </button>
    </div>
  );

  // The trigger button - a simple "+" icon
  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled || isUploading}
      className={cn(
        "h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800",
        isOpen && "bg-gray-100 dark:bg-gray-800",
        className
      )}
    >
      {isUploading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-600 dark:text-gray-400" />
      ) : isOpen ? (
        <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      ) : (
        <Plus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      )}
    </Button>
  );

  return (
    <div className="flex items-center gap-2">
      {fileInput}

      {/* Desktop: Popover */}
      {!isMobile ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            {triggerButton}
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            className="w-72 p-2"
          >
            {menuContent}
          </PopoverContent>
        </Popover>
      ) : (
        /* Mobile: Bottom Sheet */
        <>
          <div onClick={() => !disabled && !isUploading && setIsOpen(true)}>
            {triggerButton}
          </div>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent side="bottom" className="px-4 pb-8">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-center">{t('agents:fileUpload.addToChat')}</SheetTitle>
              </SheetHeader>
              {menuContent}
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* Uploaded Files Pills - inline with the button */}
      {uploadedFiles.map((file) => (
        <div
          key={file.gemini_uri}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
        >
          <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="max-w-[120px] truncate text-gray-700 dark:text-gray-300">
            {file.original_filename}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-xs">
            ({formatFileSize(file.size_bytes)})
          </span>
          <button
            type="button"
            onClick={() => onFileRemoved(file.gemini_uri)}
            className="ml-1 hover:text-red-500 dark:hover:text-red-400"
            aria-label={t('agents:fileUpload.removeFile', { filename: file.original_filename })}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
