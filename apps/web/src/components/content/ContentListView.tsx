import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PenTool,
  MoreVertical,
  Eye,
  Copy,
  Archive,
  Plus,
  Calendar,
  FileText,
} from 'lucide-react';
import { type AgentOutput } from '@/hooks/data/useAgentOutputs';
import { cn } from '@/lib/utils';

interface ContentListViewProps {
  contents: AgentOutput[];
  isLoading: boolean;
  selectedContentId?: string;
  onSelectContent: (content: AgentOutput) => void;
  onCopyContent?: (contentId: string) => void;
  onArchiveContent?: (contentId: string) => void;
  onRestoreContent?: (contentId: string) => void;
  onCreateContent?: () => void;
}

/**
 * Mobile-optimized list view for generated content
 * - Full-width cards with touch-friendly targets
 * - Shows key content info: title, type, preview
 * - Actions menu for View, Copy, Archive
 * - Empty state for no content
 */
export function ContentListView({
  contents,
  isLoading,
  selectedContentId,
  onSelectContent,
  onCopyContent,
  onArchiveContent,
  onRestoreContent,
  onCreateContent,
}: ContentListViewProps) {
  const { locale } = useLocale('common');

  const getContentTypeColor = (type?: string) => {
    const typeColors: Record<string, string> = {
      'blog_post': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
      'seo_blog': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'thought_leadership': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'email': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      'email_drip': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'social_media': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      'social_calendar': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
      'ad_copy': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'usp_content': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    };
    return typeColors[type || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const getContentTypeLabel = (type?: string) => {
    const typeLabels: Record<string, string> = {
      'blog_post': 'Blog Post',
      'seo_blog': 'SEO Blog',
      'thought_leadership': 'Thought Leadership',
      'email': 'Email',
      'email_drip': 'Email Campaign',
      'social_media': 'Social Media',
      'social_calendar': 'Social Calendar',
      'ad_copy': 'Ad Copy',
      'usp_content': 'USP Content',
    };
    return typeLabels[type || ''] || type || 'Content';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(getIntlLocale(locale), { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get a preview of the content
  const getContentPreview = (content: AgentOutput) => {
    if (content.summary) {
      return content.summary;
    }
    // Try to extract preview from content object
    if (content.content?.preview) {
      return content.content.preview;
    }
    if (content.content?.headline) {
      return content.content.headline;
    }
    if (content.content?.subject) {
      return content.content.subject;
    }
    return 'No preview available';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <PenTool className="w-12 h-12 mx-auto text-gray-400 mb-3 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading content...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (contents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <PenTool className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No content yet
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          Create your first piece of content to get started
        </p>
        {onCreateContent && (
          <Button
            onClick={onCreateContent}
            className="bg-gradient-to-br from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Content
          </Button>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-3 p-3">
      {contents.map((content) => (
        <Card
          key={content.id}
          className={cn(
            "p-4 cursor-pointer transition-all duration-200 border-2 hover:shadow-lg active:scale-[0.98]",
            selectedContentId === content.id
              ? 'bg-green-50 dark:bg-green-950/20 border-green-400 dark:border-green-700'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700',
            content.archived_at && 'opacity-60'
          )}
          onClick={() => onSelectContent(content)}
        >
          {/* Archived Badge */}
          {content.archived_at && (
            <Badge
              variant="secondary"
              className="absolute top-3 right-12 text-xs px-2 py-0.5"
            >
              <Archive className="w-3 h-3 mr-1" />
              Archived
            </Badge>
          )}

          <div className="flex items-start justify-between gap-3">
            {/* Left: Icon + Content */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Content Title */}
                <p className="font-semibold text-base text-gray-900 dark:text-gray-100 break-words leading-snug">
                  {content.title}
                </p>

                {/* Preview/Summary */}
                <p className="text-sm text-gray-600 dark:text-gray-400 break-words leading-snug line-clamp-2">
                  {getContentPreview(content)}
                </p>

                {/* Badges Row */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {/* Content Type Badge */}
                  {content.output_type && (
                    <Badge className={cn("text-xs px-2 py-0.5", getContentTypeColor(content.output_type))}>
                      {getContentTypeLabel(content.output_type)}
                    </Badge>
                  )}

                  {/* Date Badge */}
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(content.created_at)}
                  </Badge>

                  {/* Word Count Badge (if available) */}
                  {content.metadata?.word_count && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {content.metadata.word_count} words
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectContent(content);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Content
                </DropdownMenuItem>
                {onCopyContent && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyContent(content.id);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </DropdownMenuItem>
                )}
                {content.archived_at ? (
                  onRestoreContent && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreContent(content.id);
                      }}
                      className="text-green-600 dark:text-green-400"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Restore
                    </DropdownMenuItem>
                  )
                ) : (
                  onArchiveContent && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveContent(content.id);
                      }}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  );
}
