import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Globe,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  TrendingUp,
  Briefcase
} from 'lucide-react';

interface CompanyProfile {
  name: string;
  industry?: string;
  size?: string;
  type: 'SME' | 'AGENCY';
  description?: string;
  website?: string;
  founded_year?: string;
  employee_count?: string;
  headquarters?: string;
  mission_statement?: string;
  core_values?: string[];
  key_products?: string[];
  annual_revenue_range?: string;
  business_stage?: string;
  funding_status?: string;
  technology_stack?: string[];
  operating_regions?: string[];
  data_completeness_score?: number;
}

interface CompanyProfileCardProps {
  company: CompanyProfile;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CompanyProfileCard({ company, isExpanded, onToggle }: CompanyProfileCardProps) {
  const { t } = useTranslation(['agents']);

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-2 -m-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">{t('agents:context.companyProfile.title')}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {company.name && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CardContent className="pt-3">
            {company.name ? (
              <>
                {/* Always visible - collapsed view */}
                <div className="space-y-3 mb-3">
                  <div>
                    <div className="font-medium text-base">{company.name}</div>
                    {company.industry && (
                      <div className="text-sm text-muted-foreground">
                        {company.industry}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{company.type}</Badge>
                    {company.size && (
                      <Badge variant="outline">{company.size}</Badge>
                    )}
                    {company.annual_revenue_range && (
                      <Badge variant="secondary">{company.annual_revenue_range}</Badge>
                    )}
                  </div>

                  {(company.data_completeness_score !== undefined) && (
                    <div className="text-sm text-muted-foreground">
                      {t('agents:context.companyProfile.dataCompleteness', { score: company.data_completeness_score })}
                    </div>
                  )}
                </div>

                {/* Expanded View */}
                <CollapsibleContent>
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-base">{company.name}</div>
                          {company.industry && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {company.industry}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {company.type}
                          </Badge>
                          {company.data_completeness_score && (
                            <Badge variant="secondary" className="text-xs">
                              {t('agents:context.companyProfile.complete', { score: company.data_completeness_score })}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Company Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {company.website && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.website')}</span>
                            <a href={company.website} className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                              {company.website.replace(/https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                        {company.founded_year && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.founded')}</span>
                            <span>{company.founded_year}</span>
                          </div>
                        )}
                        {company.employee_count && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.teamSize')}</span>
                            <span>{company.employee_count}</span>
                          </div>
                        )}
                        {company.headquarters && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.hq')}</span>
                            <span>{company.headquarters}</span>
                          </div>
                        )}
                        {company.annual_revenue_range && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.revenue')}</span>
                            <span>{company.annual_revenue_range}</span>
                          </div>
                        )}
                        {company.business_stage && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.stage')}</span>
                            <span>{company.business_stage}</span>
                          </div>
                        )}
                        {company.funding_status && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.funding')}</span>
                            <span>{company.funding_status}</span>
                          </div>
                        )}
                      </div>

                      {/* Technology Stack */}
                      {company.technology_stack && company.technology_stack.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1 flex items-center gap-1">
                            <Briefcase className="h-3 w-3 text-blue-600" />
                            {t('agents:context.companyProfile.sections.technologyStack')}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {company.technology_stack.map((tech, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Operating Regions */}
                      {company.operating_regions && company.operating_regions.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1 flex items-center gap-1">
                            <Globe className="h-3 w-3 text-green-600" />
                            {t('agents:context.companyProfile.sections.operatingRegions')}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {company.operating_regions.map((region, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {region}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mission & Values */}
                      {company.mission_statement && (
                        <div>
                          <div className="font-medium text-sm mb-1">{t('agents:context.companyProfile.sections.missionStatement')}</div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {company.mission_statement}
                          </p>
                        </div>
                      )}

                      {/* Core Values */}
                      {company.core_values && company.core_values.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1">{t('agents:context.companyProfile.sections.coreValues')}</div>
                          <div className="flex flex-wrap gap-1">
                            {company.core_values.map((value, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Products */}
                      {company.key_products && company.key_products.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1">{t('agents:context.companyProfile.sections.mainProductsServices')}</div>
                          <div className="flex flex-wrap gap-1">
                            {company.key_products.map((product, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {product}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('agents:context.companyProfile.basicInfoNeeded')}
              </div>
            )}
          </CardContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
