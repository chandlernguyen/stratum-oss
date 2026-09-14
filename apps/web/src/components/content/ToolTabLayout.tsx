import { type ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Eye, FileText } from 'lucide-react';
import { ContentGenerationView } from './ContentGenerationView';

interface ToolTabLayoutProps {
  activeTab: 'form' | 'generation';
  onTabChange: (tab: 'form' | 'generation') => void;
  generatedContent: any;
  formComponent: ReactNode;
  generationLabel?: string;
  tool: string;
  formData: any;
  onExport: (format: string) => void;
  onRefine: (feedback: string) => void;
  onSave: () => void;
  isGenerating: boolean;
  saveStatus?: 'saving' | 'saved' | 'error';
  error?: string;
}

export function ToolTabLayout({
  activeTab,
  onTabChange,
  generatedContent,
  formComponent,
  generationLabel = 'Content',
  tool,
  formData,
  onExport,
  onRefine,
  onSave,
  isGenerating,
  saveStatus,
  error
}: ToolTabLayoutProps) {
  // Determine icon for second tab based on label
  const getGenerationIcon = () => {
    if (generationLabel === 'Content Plan' || generationLabel === 'Content Ideas' || generationLabel === 'Blog Template') {
      return FileText;
    }
    return Eye;
  };

  const GenerationIcon = getGenerationIcon();

  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'form' | 'generation')}>
      <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
        <TabsTrigger value="form" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configuration
        </TabsTrigger>
        <TabsTrigger value="generation" className="flex items-center gap-2" disabled={!generatedContent}>
          <GenerationIcon className="h-4 w-4" />
          {generationLabel}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="form" className="mt-6">
        {formComponent}
      </TabsContent>

      <TabsContent value="generation" className="mt-6">
        <ContentGenerationView
          formData={formData}
          tool={tool}
          onExport={onExport}
          onRefine={onRefine}
          onSave={onSave}
          generatedContent={generatedContent}
          isGenerating={isGenerating}
          saveStatus={saveStatus}
          error={error}
        />
      </TabsContent>
    </Tabs>
  );
}
