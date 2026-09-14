import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Briefcase,
} from 'lucide-react';

interface CompanyProfileSectionProps {
  company: any;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CompanyProfileSection({ company, isExpanded, onToggle }: CompanyProfileSectionProps) {
  const { t } = useTranslation(['agents']);

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-2 -m-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand-info" />
                <CardTitle className="text-lg">{t('agents:context.companyProfile.title')}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {company.name && (
                  <CheckCircle className="h-4 w-4 text-brand-success" />
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

                      {/* Company Details Section */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2">{t('agents:context.companyProfile.sections.companyDetails')}</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {company.website && (
                              <div>
                                <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.website')}</span>
                                <a href={company.website} className="text-brand-info hover:underline ml-2" target="_blank" rel="noopener">
                                  {company.website.replace(/https?:\/\//, '')}
                                </a>
                              </div>
                            )}
                            {company.industry && (
                              <div>
                                <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.industry')}</span>
                                <span className="ml-2">{company.industry}</span>
                              </div>
                            )}
                            {company.size || company.employee_count && (
                              <div>
                                <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.companySize')}</span>
                                <span className="ml-2">{company.size || company.employee_count}</span>
                              </div>
                            )}
                            {company.business_model && (
                              <div>
                                <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.businessModel')}</span>
                                <span className="ml-2">{company.business_model}</span>
                              </div>
                            )}
                            {company.business_stage && (
                              <div>
                                <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.companyStage')}</span>
                                <span className="ml-2">{company.business_stage}</span>
                              </div>
                            )}
                            {company.funding_status && (
                              <div>
                                <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.fundingStatus')}</span>
                                <span className="ml-2">{company.funding_status}</span>
                              </div>
                            )}
                            {company.annual_revenue_range && (
                              <div>
                                <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.annualRevenue')}</span>
                                <span className="ml-2">{company.annual_revenue_range}</span>
                              </div>
                            )}
                            {company.marketing_budget && (
                              <div>
                                <span className="text-muted-foreground">{t('agents:context.companyProfile.fields.marketingBudget')}</span>
                                <span className="ml-2">{company.marketing_budget}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Technology Stack */}
                      {company.technology_stack && company.technology_stack.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1 flex items-center gap-1">
                            <Briefcase className="h-3 w-3 text-brand-info" />
                            {t('agents:context.companyProfile.sections.technologyStack')}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {company.technology_stack.map((tech: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Geographic Presence */}
                      {(company.operating_regions || company.geography) && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">{t('agents:context.companyProfile.sections.geographicPresence')}</h4>
                          <div className="space-y-2">
                            {company.operating_regions && company.operating_regions.length > 0 && (
                              <div>
                                <span className="text-xs text-muted-foreground">{t('agents:context.companyProfile.sections.operatingRegions')}:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {company.operating_regions.map((region: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {region}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Market & Competition */}
                      {(company.target_market_segments || company.main_products_services || company.key_competitors) && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">{t('agents:context.companyProfile.sections.marketCompetition')}</h4>
                          <div className="space-y-3">
                            {company.target_market_segments && company.target_market_segments.length > 0 && (
                              <div>
                                <span className="text-xs text-muted-foreground">{t('agents:context.companyProfile.sections.targetMarketSegments')}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {company.target_market_segments.map((segment: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {segment}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {company.main_products_services && company.main_products_services.length > 0 && (
                              <div>
                                <span className="text-xs text-muted-foreground">{t('agents:context.companyProfile.sections.mainProductsServices')}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {company.main_products_services.map((product: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {product}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {company.key_competitors && company.key_competitors.length > 0 && (
                              <div>
                                <span className="text-xs text-muted-foreground">{t('agents:context.companyProfile.sections.keyCompetitors')}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {company.key_competitors.map((competitor: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {competitor}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
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
                            {company.core_values.map((value: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {value}
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