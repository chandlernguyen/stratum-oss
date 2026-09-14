import type { BlogPost } from "@/types/agentTools";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Copy, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BlogPostPreviewProps {
  data: BlogPost;
}

export function BlogPostPreview({ data }: BlogPostPreviewProps) {
  const { t } = useTranslation('agents');

  return (
    <Card className="w-full  my-4 tool-output" data-agent="content">
      <CardHeader>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">
                <FileText className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
                <CardTitle className="text-xl">{t('toolRenderers.blogPost.title')}</CardTitle>
                <CardDescription>{data.title}</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">{t('toolRenderers.blogPost.outline')}</h4>
          <ul className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {data.outline.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">{t('toolRenderers.blogPost.body')}</h4>
          <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
            {data.body}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">{t('toolRenderers.blogPost.seoKeywords')}</h4>
          <div className="flex flex-wrap gap-2">
            {data.seo_keywords.map((keyword, index) => (
              <div key={index} className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                {keyword}
              </div>
            ))}
          </div>
        </div>
        <div className="tool-actions mt-6 flex gap-2 justify-end">
            <Button variant="outline"><Copy className="w-4 h-4 mr-2" /> {t('toolRenderers.common.copyText')}</Button>
            <Button><Send className="w-4 h-4 mr-2" /> {t('toolRenderers.blogPost.exportToCms')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
