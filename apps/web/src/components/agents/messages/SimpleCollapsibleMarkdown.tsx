import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SimpleCollapsibleMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

// Helper to extract text from React elements  
const extractText = (node: any): string => {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && node.props?.children) {
    return extractText(node.props.children);
  }
  return '';
};

// Global counter for tracking cell indices within tables
let currentCellIndex = 0;
let currentTableHeaders: string[] = [];

export function SimpleCollapsibleMarkdown({ content, isStreaming = false }: SimpleCollapsibleMarkdownProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Pre-process content to handle collapsing and remove tool_code blocks
  const processedContent = (() => {
    if (!content) return content;
    
    // Remove tool_code blocks first
    let cleanContent = content.replace(/<tool_code>[\s\S]*?<\/tool_code>/g, '');
    
    const lines = cleanContent.split('\n');
    const result: string[] = [];
    let currentCollapsedSection: string | null = null;
    let currentLevel = 0;
    
    for (const line of lines) {
      // Check if this is a header
      const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
      
      if (headerMatch) {
        const level = headerMatch[1].length;
        const heading = headerMatch[2];
        const sectionId = heading.replace(/\s+/g, '-').toLowerCase();
        
        // If we were in a collapsed section and hit a header of same or higher level, we're out
        if (currentCollapsedSection && level <= currentLevel) {
          currentCollapsedSection = null;
        }
        
        // Check if this section is collapsed
        if (collapsedSections.has(sectionId)) {
          currentCollapsedSection = sectionId;
          currentLevel = level;
        }
        
        // Always include the header
        result.push(line);
      } else if (!currentCollapsedSection) {
        // Only include content if we're not in a collapsed section
        result.push(line);
      }
    }
    
    return result.join('\n');
  })();

  // Custom components for headers with collapse functionality
  const components = {
    h1: ({ children }: any) => {
      const text = extractText(children);
      const sectionId = text.replace(/\s+/g, '-').toLowerCase();
      const isCollapsed = collapsedSections.has(sectionId);
      
      return (
        <h1 
          className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 mt-6 flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
          onClick={(e) => {
            e.preventDefault();
            toggleSection(sectionId);
          }}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          {children}
        </h1>
      );
    },
    h2: ({ children }: any) => {
      const text = extractText(children);
      const sectionId = text.replace(/\s+/g, '-').toLowerCase();
      const isCollapsed = collapsedSections.has(sectionId);
      
      return (
        <h2 
          className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3 flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
          onClick={(e) => {
            e.preventDefault();
            toggleSection(sectionId);
          }}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          {children}
        </h2>
      );
    },
    h3: ({ children }: any) => {
      const text = extractText(children);
      const sectionId = text.replace(/\s+/g, '-').toLowerCase();
      const isCollapsed = collapsedSections.has(sectionId);
      
      return (
        <h3 
          className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-4 mb-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
          onClick={(e) => {
            e.preventDefault();
            toggleSection(sectionId);
          }}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {children}
        </h3>
      );
    },
    p: ({ children }: any) => (
      <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside space-y-2 my-3 ml-4 text-gray-700 dark:text-gray-300">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside space-y-2 my-3 ml-4 text-gray-700 dark:text-gray-300">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed">
        <span className="ml-2">{children}</span>
      </li>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-gray-900 dark:text-gray-100">
        {children}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-gray-600 dark:text-gray-400">
        {children}
      </em>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-brand-gold pl-4 my-4 italic text-gray-600 dark:text-gray-400">
        {children}
      </blockquote>
    ),
    code: ({ inline, children }: any) => {
      if (inline) {
        return (
          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-brand-gold dark:text-amber-400">
            {children}
          </code>
        );
      }
      return (
        <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto">
          {children}
        </code>
      );
    },
    hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,
    table: ({ children }: any) => {
      // Reset globals for new table
      currentCellIndex = 0;
      currentTableHeaders = [];
      return (
        <div className="my-4 mobile-responsive-table">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700">
            {children}
          </table>
        </div>
      );
    },
    thead: ({ children }: any) => (
      <thead className="bg-gray-50 dark:bg-gray-800">
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
        {children}
      </tbody>
    ),
    tr: ({ children }: any) => {
      // Reset cell index for each row
      currentCellIndex = 0;
      return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          {children}
        </tr>
      );
    },
    th: ({ children }: any) => {
      // Capture header text
      const text = extractText(children);
      currentTableHeaders.push(text);
      return (
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider border-r border-gray-300 dark:border-gray-700 last:border-r-0">
          {children}
        </th>
      );
    },
    td: ({ children }: any) => {
      // Get label from captured headers
      const label = currentTableHeaders[currentCellIndex] || '';
      currentCellIndex++;
      return (
        <td
          data-label={label}
          className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
        >
          {children}
        </td>
      );
    },
  };

  return (
    <div className={`prose prose-stone dark:prose-invert max-w-none ${isStreaming ? 'animate-pulse-subtle' : ''}`}>
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-2 h-5 bg-brand-gold animate-blink ml-1" />
        )}
      </div>
    </div>
  );
}