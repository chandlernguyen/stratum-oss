import { getCurrentLanguage } from '@/lib/i18n';
import { getIntlLocale } from '@/lib/locales';

function getExportMetadataDate() {
  return new Date().toLocaleDateString(getIntlLocale(getCurrentLanguage()));
}

export function exportToText(content: string, filename: string, toolType: string) {
  // Create plain text file with metadata header
  const textContent = `${filename}
Generated: ${getExportMetadataDate()}
Type: ${toolType}
${'='.repeat(60)}

${content}

${'='.repeat(60)}
Generated with STRAŦUM - Marketing Intelligence Platform`;

  const blob = new Blob([textContent], {
    type: 'text/plain;charset=utf-8'
  });

  downloadFile(blob, `${filename}.txt`);
}

export function exportToPDF(content: string, filename: string, toolType: string) {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${filename}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .header {
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #3B82F6;
            margin: 0 0 10px 0;
            font-size: 28px;
        }
        .metadata {
            color: #64748B;
            font-size: 14px;
        }
        .content {
            margin-top: 30px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${filename}</h1>
        <div class="metadata">
            Generated: ${getExportMetadataDate()} | Type: ${toolType}
        </div>
    </div>
    <div class="content">
        ${content.replace(/\n/g, '<br>')}
    </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
}

export function copyToClipboard(content: string) {
  navigator.clipboard.writeText(content).catch((err) => {
    console.error('Failed to copy to clipboard:', err);
  });
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
