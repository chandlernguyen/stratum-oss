import { useState, useCallback } from 'react';

interface CopyStatus {
  copied: boolean;
  error: Error | null;
}

export function useCopyToClipboard(resetInterval = 2000) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>({
    copied: false,
    error: null
  });

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus({ copied: true, error: null });
      
      // Reset status after interval
      setTimeout(() => {
        setCopyStatus({ copied: false, error: null });
      }, resetInterval);
      
      return true;
    } catch (error) {
      setCopyStatus({ 
        copied: false, 
        error: error instanceof Error ? error : new Error('Failed to copy')
      });
      return false;
    }
  }, [resetInterval]);

  const copyJSON = useCallback(async (data: any) => {
    const text = JSON.stringify(data, null, 2);
    return copy(text);
  }, [copy]);

  // Helper to format keys for display
  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Recursively format content to readable text (not markdown)
  const formatToReadableText = useCallback((data: any, depth: number = 0): string => {
    const indent = '  '.repeat(depth);

    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item, i) => {
        if (typeof item === 'object' && item !== null) {
          const itemLines = Object.entries(item)
            .map(([k, v]) => `${indent}     ${formatKey(k)}: ${v}`)
            .join('\n');
          return `${indent}  ${i + 1}.\n${itemLines}`;
        }
        return `${indent}  ${i + 1}. ${item}`;
      }).join('\n');
    }

    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).map(([key, value]) => {
        const formattedKey = formatKey(key);

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return `${indent}${formattedKey}:\n${'-'.repeat(formattedKey.length + 1)}\n${formatToReadableText(value, depth + 1)}`;
        } else if (Array.isArray(value)) {
          return `${indent}${formattedKey}:\n${formatToReadableText(value, depth)}`;
        }
        return `${indent}${formattedKey}: ${value}`;
      }).join('\n\n');
    }

    return String(data);
  }, []);

  const copyMarkdown = useCallback(async (data: any, title?: string) => {
    // Create user-friendly text format with title header
    let text = title ? `${title}\n${'='.repeat(title.length)}\n\n` : '';
    text += formatToReadableText(data);
    return copy(text);
  }, [copy, formatToReadableText]);

  return {
    copy,
    copyJSON,
    copyMarkdown,
    copied: copyStatus.copied,
    error: copyStatus.error
  };
}