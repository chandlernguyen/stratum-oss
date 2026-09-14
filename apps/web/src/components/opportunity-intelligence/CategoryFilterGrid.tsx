import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  FileText,
  Share2,
  Mail,
  Target,
  Users,
  BarChart3,
  Grid3x3,
} from 'lucide-react';
import type { OpportunitySummary } from '@/hooks/data/useOpportunityIntelligence';

interface CategoryFilterGridProps {
  summary: OpportunitySummary | null;
  activeCategory?: string;
  onCategoryChange: (category?: string) => void;
}

interface CategoryConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'seo',
    name: 'SEO',
    icon: Search,
    description: 'Search optimization',
    color: 'blue',
    borderColor: 'border-l-blue-500',
    bgColor: 'from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900',
    iconColor: 'text-slate-600 dark:text-slate-400',
  },
  {
    id: 'content',
    name: 'Content',
    icon: FileText,
    description: 'Content creation',
    color: 'purple',
    borderColor: 'border-l-amber-500',
    bgColor: 'from-slate-50 to-amber-100 dark:from-slate-950 dark:to-amber-900',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'social',
    name: 'Social Media',
    icon: Share2,
    description: 'Social engagement',
    color: 'pink',
    borderColor: 'border-l-pink-500',
    bgColor: 'from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900',
    iconColor: 'text-pink-600 dark:text-pink-400',
  },
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    description: 'Email marketing',
    color: 'green',
    borderColor: 'border-l-green-500',
    bgColor: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    id: 'conversion',
    name: 'Conversion',
    icon: Target,
    description: 'CRO tactics',
    color: 'orange',
    borderColor: 'border-l-orange-500',
    bgColor: 'from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    id: 'retention',
    name: 'Retention',
    icon: Users,
    description: 'Customer loyalty',
    color: 'indigo',
    borderColor: 'border-l-indigo-500',
    bgColor: 'from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: BarChart3,
    description: 'Data tracking',
    color: 'teal',
    borderColor: 'border-l-teal-500',
    bgColor: 'from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
];

export function CategoryFilterGrid({
  summary,
  activeCategory,
  onCategoryChange,
}: CategoryFilterGridProps) {
  const getCategoryCount = (categoryId: string): number => {
    if (!summary?.by_category) return 0;
    return summary.by_category[categoryId] || 0;
  };

  const getTotalCount = (): number => {
    if (!summary?.total_opportunities) return 0;
    return summary.total_opportunities;
  };

  const isActive = (categoryId?: string): boolean => {
    if (!categoryId) return !activeCategory;
    return activeCategory === categoryId;
  };

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Filter by Category
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          View opportunities organized by marketing category
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* All Categories Card */}
        <Card
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 ${
            isActive()
              ? 'border-l-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 ring-2 ring-amber-400 dark:ring-amber-600'
              : 'border-l-gray-400 hover:border-l-amber-400'
          }`}
          onClick={() => onCategoryChange(undefined)}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  isActive()
                    ? 'bg-amber-100 dark:bg-amber-900'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <Grid3x3
                  className={`h-5 w-5 ${
                    isActive()
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3
                    className={`font-semibold text-sm ${
                      isActive()
                        ? 'text-amber-900 dark:text-amber-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    All Categories
                  </h3>
                  <Badge
                    variant={isActive() ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {getTotalCount()}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  View all opportunities
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Cards */}
        {CATEGORIES.map((category) => {
          const count = getCategoryCount(category.id);
          const active = isActive(category.id);
          const Icon = category.icon;

          return (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 ${
                active
                  ? `${category.borderColor} bg-gradient-to-br ${category.bgColor} ring-2 ring-${category.color}-400 dark:ring-${category.color}-600`
                  : `border-l-gray-300 hover:${category.borderColor}`
              } ${count === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (count > 0) {
                  onCategoryChange(category.id);
                }
              }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      active
                        ? `bg-${category.color}-100 dark:bg-${category.color}-900`
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        active ? category.iconColor : 'text-gray-600 dark:text-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3
                        className={`font-semibold text-sm truncate ${
                          active
                            ? `text-${category.color}-900 dark:text-${category.color}-100`
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {category.name}
                      </h3>
                      <Badge
                        variant={active ? 'default' : 'secondary'}
                        className="text-xs flex-shrink-0"
                      >
                        {count}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {category.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
