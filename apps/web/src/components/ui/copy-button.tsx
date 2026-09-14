import { Copy, Check, FileText, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

interface CopyButtonProps {
  data: any;
  title?: string;
  className?: string;
  variant?: 'icon' | 'button';
}

export function CopyButton({ 
  data, 
  title,
  className = '', 
  variant = 'icon' 
}: CopyButtonProps) {
  const { copyJSON, copyMarkdown, copied } = useCopyToClipboard();

  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className={`h-8 w-8 ${className}`}
            aria-label="Copy options"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => copyMarkdown(data, title)}>
            <FileText className="mr-2 h-4 w-4" />
            Copy as Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => copyJSON(data)}>
            <FileJson className="mr-2 h-4 w-4" />
            Copy as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={className}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => copyMarkdown(data, title)}>
          <FileText className="mr-2 h-4 w-4" />
          Copy as Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyJSON(data)}>
          <FileJson className="mr-2 h-4 w-4" />
          Copy as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}