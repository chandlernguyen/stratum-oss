import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';
import {
  Calculator,
  Database,
  TrendingUp,
  Upload,
  BarChart3,
  Target,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';

interface ROITool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  available: boolean;
  color: string;
}

const roiTools: ROITool[] = [
  {
    id: 'roi-calculator',
    name: 'ROI Calculator',
    description: 'Calculate return on investment with actual campaign data or manual input scenarios',
    icon: Calculator,
    href: '/roi-budget/tool/roi-calculator',
    badge: 'Popular',
    available: true,
    color: 'blue'
  },
  {
    id: 'data-manager',
    name: 'Campaign Data Manager',
    description: 'View, edit, and manage your campaign performance metrics across all platforms',
    icon: Database,
    href: '/roi-budget/tool/data-manager',
    available: true,
    color: 'purple'
  },
  {
    id: 'performance-charts',
    name: 'Historical Performance',
    description: 'Visualize spend vs revenue trends, ROI over time, and campaign comparisons',
    icon: TrendingUp,
    href: '/roi-budget/tool/performance-charts',
    badge: 'Visual',
    available: true,
    color: 'green'
  },
  {
    id: 'data-import',
    name: 'Data Import Wizard',
    description: 'Import campaign metrics from CSV files with guided mapping and validation',
    icon: Upload,
    href: '/roi-budget/tool/data-import',
    available: true,
    color: 'yellow'
  },
  {
    id: 'manual-entry',
    name: 'Manual Data Entry',
    description: 'Quickly add individual campaign performance metrics with auto-calculated ROI',
    icon: FileSpreadsheet,
    href: '/roi-budget/tool/manual-entry',
    available: true,
    color: 'cyan'
  },
  {
    id: 'budget-optimizer',
    name: 'Budget Optimizer',
    description: 'Optimize budget allocation across channels with 4 frameworks: ROI, Marginal Efficiency, CAC, Attribution',
    icon: Target,
    href: '/roi-budget/tool/budget-optimizer',
    badge: 'New',
    available: true,
    color: 'orange'
  },
  {
    id: 'scenario-planning',
    name: 'Scenario Planning',
    description: 'Model different budget scenarios and projected outcomes with what-if analysis',
    icon: BarChart3,
    href: '/roi-budget/tool/scenario-planning',
    available: false,
    color: 'indigo'
  },
  {
    id: 'attribution-analysis',
    name: 'Attribution Analysis',
    description: 'Multi-touch attribution modeling to understand which channels drive ROI',
    icon: PieChart,
    href: '/roi-budget/tool/attribution',
    badge: 'Advanced',
    available: false,
    color: 'pink'
  }
];

export function ROIToolGrid() {
  const { clientSlug } = useClientContext();
  const availableTools = roiTools.filter(tool => tool.available);
  const comingSoonTools = roiTools.filter(tool => !tool.available);

  const getColorClasses = (color: string, available: boolean) => {
    if (!available) return 'text-gray-400 dark:text-gray-600';

    const colors: Record<string, string> = {
      blue: 'text-blue-600 dark:text-blue-400',
      purple: 'text-amber-600 dark:text-amber-400',
      green: 'text-green-600 dark:text-green-400',
      yellow: 'text-yellow-600 dark:text-yellow-400',
      cyan: 'text-cyan-600 dark:text-cyan-400',
      orange: 'text-orange-600 dark:text-orange-400',
      indigo: 'text-indigo-600 dark:text-indigo-400',
      pink: 'text-pink-600 dark:text-pink-400',
    };
    return colors[color] || 'text-blue-600 dark:text-blue-400';
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">
          ROI & Budget Intelligence Tools
        </h2>
        <p className="text-lg text-muted-foreground">
          Manage campaign data, calculate ROI, and optimize your marketing budget with AI-powered insights
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <Card className="border-blue-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{availableTools.length}</div>
              <div className="text-sm text-muted-foreground">Active Tools</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">∞</div>
              <div className="text-sm text-muted-foreground">Campaigns</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">Real-time</div>
              <div className="text-sm text-muted-foreground">Calculations</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">CSV</div>
              <div className="text-sm text-muted-foreground">Import Ready</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Tools */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Available Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.id} to={buildContextAwareUrl(tool.href, clientSlug) || tool.href}>
                <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg bg-gradient-to-br from-${tool.color}-50 to-${tool.color}-100 dark:from-${tool.color}-950 dark:to-${tool.color}-900`}>
                        <Icon className={`h-6 w-6 ${getColorClasses(tool.color, true)}`} />
                      </div>
                      {tool.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {tool.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-3">{tool.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full group">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Tools */}
      {comingSoonTools.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            Coming Soon
            <Badge variant="outline" className="text-xs">
              AI-Powered
            </Badge>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comingSoonTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.id}
                  className="h-full opacity-60 relative overflow-hidden border-dashed"
                >
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Coming Soon
                    </Badge>
                  </div>
                  <CardHeader>
                    <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 w-fit">
                      <Icon className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                    </div>
                    <CardTitle className="text-lg mt-3">{tool.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <Card className="bg-gradient-to-r from-slate-50 to-amber-50 dark:from-blue-950 dark:to-slate-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold mb-2">
            Start Tracking Your Campaign ROI
          </h3>
          <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
            Import your campaign data or enter metrics manually to start calculating ROI,
            optimizing budgets, and making data-driven decisions.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to={buildContextAwareUrl("/roi-budget/tool/data-import", clientSlug) || "/roi-budget/tool/data-import"}>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV Data
              </Button>
            </Link>
            <Link to={buildContextAwareUrl("/roi-budget/tool/manual-entry", clientSlug) || "/roi-budget/tool/manual-entry"}>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Manual Entry
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
