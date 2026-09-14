import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2, ArrowRight, Info, X, Save, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { toast } from 'sonner';
import { INDUSTRY_MAP, COMPANY_SIZE_MAP, INDUSTRY_KEYS, COMPANY_SIZE_KEYS } from '@/config/businessConstants';

interface ClientBusinessContext {
  companyName: string;
  industry: string;
  companySize: string;
  targetMarket: string;
  description?: string;
  competitors?: string[];
  priceRange?: string;
  businessModel?: string;
  uniqueValue?: string;
  website?: string;
  brandVoice?: string;
  customerSegments?: string[];
  monthlyBudget?: number;
  status?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface ClientOnboardingFormProps {
  editMode?: boolean;
  clientSlug?: string;
}

export function ClientOnboardingForm({ editMode = false, clientSlug }: ClientOnboardingFormProps = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation(['clients', 'onboarding']);
  const { data: identity } = useUserIdentity();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [showContextWizard, setShowContextWizard] = useState(true);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [customerSegments, setCustomerSegments] = useState<string[]>([]);
  const [newSegment, setNewSegment] = useState('');
  
  const [formData, setFormData] = useState<ClientBusinessContext>({
    companyName: '',
    industry: '',
    companySize: '',
    targetMarket: '',
    description: '',
    competitors: [],
    priceRange: '',
    businessModel: '',
    uniqueValue: '',
    website: '',
    brandVoice: '',
    customerSegments: [],
    monthlyBudget: undefined,
    status: 'active',
    contact_email: '',
    contact_phone: ''
  });
  const [clientId, setClientId] = useState<string | null>(null);

  const businessModelOptions = [
    'B2B',
    'B2C',
    'B2B2C',
    'Marketplace',
    'Subscription',
    'Freemium',
    'Direct Sales',
    'E-commerce',
    'Service-based'
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'churned', label: 'Churned' }
  ];

  // Load existing client data in edit mode (schema-aware)
  useEffect(() => {
    async function loadClientData() {
      if (!editMode || !clientSlug || !identity?.organization?.id) return;

      setLoading(true);
      try {
        // Use schema-aware router function to load client
        const { data: client, error } = await supabase.rpc('get_client_by_slug_routed', {
          p_org_id: identity.organization.id,
          p_slug: clientSlug
        });

        if (error) {
          console.error('Error loading client:', error);
          toast.error('Failed to load client details');
          navigate('/clients');
          return;
        }

        if (client) {
          const clientData = client as any;
          const settings = clientData.settings || {};
          setClientId(clientData.id);
          setFormData({
            companyName: clientData.name || '',
            industry: clientData.industry || '',
            companySize: settings.companySize || '',
            targetMarket: settings.targetMarket || '',
            description: settings.description || '',
            competitors: settings.competitors || [],
            priceRange: settings.priceRange || '',
            businessModel: settings.businessModel || '',
            uniqueValue: settings.uniqueValue || '',
            website: clientData.website || '',
            brandVoice: settings.brandVoice || '',
            customerSegments: settings.customerSegments || [],
            monthlyBudget: settings.monthlyBudget || undefined,
            status: clientData.status || 'active',
            contact_email: clientData.contact_email || '',
            contact_phone: clientData.contact_phone || ''
          });
          setCompetitors(settings.competitors || []);
          setCustomerSegments(settings.customerSegments || []);
        }
      } catch (err) {
        console.error('Error loading client:', err);
        toast.error('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadClientData();
  }, [editMode, clientSlug, identity?.organization?.id, navigate]);

  const handleInputChange = (field: keyof ClientBusinessContext, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Real-time duplicate name checking (schema-aware)
  const checkForDuplicateName = async (name: string) => {
    if (!name.trim() || !identity?.organization?.id) return;

    setCheckingDuplicate(true);
    setError(null);
    setNameSuggestions([]);

    try {
      // Generate slug the same way the database will
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if a client with this slug already exists (schema-aware via router function)
      const { data: existingClient, error } = await supabase.rpc('get_client_by_slug_routed', {
        p_org_id: identity.organization.id,
        p_slug: slug
      });

      if (error) {
        // If error is "not found", that's fine - means no duplicate
        if (error.code !== 'PGRST116') {
          console.error('Error checking duplicate name:', error);
        }
        return;
      }

      if (existingClient) {
        const client = existingClient as any;
        setError(`A client named "${client.name}" already exists in your organization.`);
        setNameSuggestions([
          `${name} (${formData.industry || 'Division'})`,
          `${name} Inc`,
          `${name} - ${new Date().getFullYear()}`
        ]);
      }
    } catch (error) {
      console.error('Error checking duplicate name:', error);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const addCompetitor = () => {
    if (newCompetitor.trim()) {
      const updatedCompetitors = [...competitors, newCompetitor.trim()];
      setCompetitors(updatedCompetitors);
      setFormData(prev => ({ ...prev, competitors: updatedCompetitors }));
      setNewCompetitor('');
    }
  };

  const removeCompetitor = (index: number) => {
    const updatedCompetitors = competitors.filter((_, i) => i !== index);
    setCompetitors(updatedCompetitors);
    setFormData(prev => ({ ...prev, competitors: updatedCompetitors }));
  };

  const addCustomerSegment = () => {
    if (newSegment.trim()) {
      const updatedSegments = [...customerSegments, newSegment.trim()];
      setCustomerSegments(updatedSegments);
      setFormData(prev => ({ ...prev, customerSegments: updatedSegments }));
      setNewSegment('');
    }
  };

  const removeCustomerSegment = (index: number) => {
    const updatedSegments = customerSegments.filter((_, i) => i !== index);
    setCustomerSegments(updatedSegments);
    setFormData(prev => ({ ...prev, customerSegments: updatedSegments }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.companyName && formData.industry && formData.companySize);
      case 2:
        return !!(formData.targetMarket && formData.businessModel);
      case 3:
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!identity?.organization?.id || !identity?.user?.id) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);
    setNameSuggestions([]);

    try {
      if (editMode && clientId) {
        // Update existing client using schema-aware router function (Migration 194)
        console.log(`[ClientOnboarding] Updating client via update_client_routed (org_type: ${identity.organization.type})`);
        const { data, error: updateError } = await supabase.rpc('update_client_routed', {
          p_client_id: clientId,
          p_org_id: identity.organization.id,
          p_name: formData.companyName,
          p_industry: formData.industry || null,
          p_website: formData.website || null,
          p_contact_email: formData.contact_email || null,
          p_contact_phone: formData.contact_phone || null,
          p_status: formData.status || 'active',
          p_company_size: formData.companySize || null,
          p_company_stage: null,
          p_business_model: formData.businessModel || null,
          p_target_market: formData.targetMarket ? [formData.targetMarket] : null,
          p_key_competitors: formData.competitors || null,
          p_unique_value_proposition: formData.uniqueValue || null,
          p_marketing_budget: formData.monthlyBudget?.toString() || null,
          p_current_marketing_channels: null,
          p_marketing_goals: null,
          p_settings: {
            description: formData.description,
            priceRange: formData.priceRange,
            brandVoice: formData.brandVoice,
            customerSegments: formData.customerSegments
          }
        });

        if (updateError) throw updateError;

        toast.success('Client updated successfully');

        // Invalidate client-related queries
        queryClient.invalidateQueries({ queryKey: ['clients', identity.organization.id] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-clients', identity.organization.id] });
        queryClient.invalidateQueries({ queryKey: ['clients-performance', identity.organization.id] });

        // Router function returns JSONB directly (not array)
        const updatedSlug = (data as any)?.slug || clientSlug;
        navigate(`/clients/${updatedSlug}`);
      } else {
        // Create new client using router function (handles both AGENCY and SME)
        // Week 1: Simplified with create_client_routed function
        console.log(`[ClientOnboarding] Creating client via create_client_routed (org_type: ${identity.organization.type})`);
        const { data, error: createError } = await supabase.rpc('create_client_routed', {
          p_org_id: identity.organization.id,
          p_name: formData.companyName,
          p_industry: formData.industry || null,
          p_website: formData.website || null,
          p_contact_email: formData.contact_email || null,
          p_contact_phone: formData.contact_phone || null,
          p_status: formData.status || 'active',
          // Intelligence fields (used by AGENCY, ignored by SME)
          p_company_size: formData.companySize || null,
          p_business_model: formData.businessModel || null,
          p_target_market: formData.targetMarket ? [formData.targetMarket] : null,
          p_key_competitors: formData.competitors || null,
            p_unique_value_proposition: formData.uniqueValue || null,
            p_marketing_budget: formData.monthlyBudget ? `$${formData.monthlyBudget}/month` : null,
            // Legacy settings JSONB for backward compatibility
            p_settings: {
              description: formData.description,
              priceRange: formData.priceRange,
              brandVoice: formData.brandVoice,
              customerSegments: formData.customerSegments
            }
          });

        if (createError) throw createError;

        // Router function returns JSONB - extract client data
        const client = data as any;

        if (client) {
          const isAgency = identity.organization.type === 'AGENCY';
          toast.success(`Client added successfully ${isAgency ? '(dual-table insert complete)' : ''}`);

          // Invalidate client-related queries to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['clients', identity.organization.id] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-clients', identity.organization.id] });
          queryClient.invalidateQueries({ queryKey: ['clients-performance', identity.organization.id] });

          navigate(`/clients/${client.slug}`);
        }
      }
    } catch (error: any) {
      console.error(`Error ${editMode ? 'updating' : 'creating'} client:`, error);

      // Handle duplicate client name (Postgres error code 23505)
      if (error.code === '23505') {
        setError(`A client named "${formData.companyName}" already exists in your organization.`);
        setNameSuggestions([
          `${formData.companyName} (${formData.industry || 'Division'})`,
          `${formData.companyName} Inc`,
          `${formData.companyName} - ${new Date().getFullYear()}`
        ]);
        // Jump back to step 1 to show the error and let user fix the name
        setCurrentStep(1);
      } else {
        const action = editMode ? 'update' : 'create';
        setError(error.message || `Failed to ${action} client. Please try again.`);
        toast.error(error.message || `Failed to ${action} client`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!formData.companyName) {
      alert('Company Name Required: Please provide at least the company name to create a client.');
      return;
    }

    if (!identity?.organization?.id) {
      alert('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      // Create client with minimal info using router function
      console.log(`[ClientOnboarding] Creating minimal client via create_client_routed (org_type: ${identity.organization.type})`);
      const { data, error: createError } = await supabase.rpc('create_client_routed', {
        p_org_id: identity.organization.id,
        p_name: formData.companyName,
        p_status: 'active'
      });

      if (createError) throw createError;

      // Router function returns JSONB - extract client data
      const client = data as any;

      if (client) {
        toast.success('Client added! You can add business context later from the client settings.');

        // Invalidate client-related queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['clients', identity.organization.id] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-clients', identity.organization.id] });
        queryClient.invalidateQueries({ queryKey: ['clients-performance', identity.organization.id] });

        navigate(`/clients/${client.slug}`);
      }
    } catch (error: any) {
      console.error('Error creating client:', error);

      // Handle duplicate client name
      if (error.code === '23505') {
        alert(
          `A client named "${formData.companyName}" already exists.\n\n` +
          `Try a different name like:\n` +
          `• "${formData.companyName} Inc"\n` +
          `• "${formData.companyName} LLC"\n` +
          `• "${formData.companyName} - ${new Date().getFullYear()}"`
        );
      } else {
        alert(`Error: ${error.message || 'Failed to create client'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!showContextWizard) {
    // Simple form without wizard
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add New Client
          </CardTitle>
          <CardDescription>
            Add a new client to your agency portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-2 border-brand-slate bg-white dark:bg-slate-900">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-brand-charcoal dark:text-slate-100">{error}</p>
                  {nameSuggestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2 text-brand-slate dark:text-slate-300">Try one of these instead:</p>
                      <ul className="space-y-1">
                        {nameSuggestions.map((suggestion, index) => (
                          <li key={index}>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-brand-gold underline hover:text-brand-gold font-semibold"
                              onClick={() => {
                                handleInputChange('companyName', suggestion);
                                setError(null);
                                setNameSuggestions([]);
                              }}
                            >
                              {suggestion}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              placeholder="Enter client company name"
              value={formData.companyName}
              onChange={(e) => {
                handleInputChange('companyName', e.target.value);
                setError(null);
                setNameSuggestions([]);
              }}
              onBlur={(e) => checkForDuplicateName(e.target.value)}
              disabled={checkingDuplicate}
            />
            {checkingDuplicate && (
              <p className="text-xs text-muted-foreground mt-1">Checking availability...</p>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Want to provide business context for better AI recommendations?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setShowContextWizard(true)}
              >
                Use the Business Context Wizard
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSkip}
            disabled={!formData.companyName || loading}
            className="w-full"
          >
            Create Client
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Full wizard experience
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            1
          </div>
          <div className={`w-24 h-1 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            2
          </div>
          <div className={`w-24 h-1 ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            3
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowContextWizard(false)}
        >
          Switch to Simple Form
        </Button>
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {editMode ? 'Edit Client Information' : "Let's Get to Know Your Client"}
            </CardTitle>
            <CardDescription>
              {editMode
                ? 'Update client information to keep AI recommendations accurate'
                : 'This information helps our AI agents provide industry-specific strategies and recommendations'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert className="border-2 border-brand-slate bg-white dark:bg-slate-900">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-brand-charcoal dark:text-slate-100">{error}</p>
                    {nameSuggestions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2 text-brand-slate dark:text-slate-300">Try one of these instead:</p>
                        <ul className="space-y-1">
                          {nameSuggestions.map((suggestion, index) => (
                            <li key={index}>
                              <Button
                                variant="link"
                                className="p-0 h-auto text-brand-gold underline hover:text-brand-gold font-semibold"
                                onClick={() => {
                                  handleInputChange('companyName', suggestion);
                                  setError(null);
                                  setNameSuggestions([]);
                                }}
                              >
                                {suggestion}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Acme Corporation"
                value={formData.companyName}
                onChange={(e) => {
                  handleInputChange('companyName', e.target.value);
                  setError(null);
                  setNameSuggestions([]);
                }}
                onBlur={(e) => checkForDuplicateName(e.target.value)}
                disabled={checkingDuplicate}
                className="mt-1"
              />
              {checkingDuplicate && (
                <p className="text-xs text-muted-foreground mt-1">Checking availability...</p>
              )}
            </div>

            <div>
              <Label htmlFor="industry">{t('clients:onboarding.industry')} *</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => handleInputChange('industry', value)}
              >
                <SelectTrigger id="industry" className="mt-1">
                  <SelectValue placeholder={t('clients:onboarding.industryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_KEYS.map((key) => (
                    <SelectItem key={key} value={INDUSTRY_MAP[key]}>
                      {t(`onboarding:industries.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="companySize">{t('clients:onboarding.companySize')} *</Label>
              <Select
                value={formData.companySize}
                onValueChange={(value) => handleInputChange('companySize', value)}
              >
                <SelectTrigger id="companySize" className="mt-1">
                  <SelectValue placeholder={t('clients:onboarding.companySizePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZE_KEYS.map((key) => (
                    <SelectItem key={key} value={COMPANY_SIZE_MAP[key]}>
                      {t(`onboarding:companySizes.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contact_email">Contact Email (Optional)</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="contact@example.com"
                value={formData.contact_email || ''}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">Contact Phone (Optional)</Label>
              <Input
                id="contact_phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.contact_phone || ''}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                className="mt-1"
              />
            </div>

            {editMode && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger id="status" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {!editMode && (
              <Button variant="outline" onClick={handleSkip}>
                Skip for Now
              </Button>
            )}
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!validateStep(1)}
              className={editMode ? 'ml-auto' : ''}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Market & Business Model */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Market & Business Model</CardTitle>
            <CardDescription>
              Understanding your client's market position helps create targeted strategies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="targetMarket">Target Market *</Label>
              <Input
                id="targetMarket"
                placeholder="e.g., Small businesses, Enterprise, Consumers"
                value={formData.targetMarket}
                onChange={(e) => handleInputChange('targetMarket', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="businessModel">Business Model *</Label>
              <Select
                value={formData.businessModel || ''}
                onValueChange={(value) => handleInputChange('businessModel', value)}
              >
                <SelectTrigger id="businessModel" className="mt-1">
                  <SelectValue placeholder="Select business model" />
                </SelectTrigger>
                <SelectContent>
                  {businessModelOptions.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priceRange">Price Range (Optional)</Label>
              <Input
                id="priceRange"
                placeholder="e.g., $50-200/month, $1000-5000 one-time"
                value={formData.priceRange}
                onChange={(e) => handleInputChange('priceRange', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="monthlyBudget">Monthly Marketing Budget (Optional)</Label>
              <Input
                id="monthlyBudget"
                type="number"
                placeholder="5000"
                value={formData.monthlyBudget || ''}
                onChange={(e) => handleInputChange('monthlyBudget', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customerSegments">Customer Segments (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="customerSegments"
                  placeholder="Add a customer segment"
                  value={newSegment}
                  onChange={(e) => setNewSegment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomerSegment())}
                />
                <Button type="button" onClick={addCustomerSegment} size="sm">
                  Add
                </Button>
              </div>
              {customerSegments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {customerSegments.map((segment, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {segment}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeCustomerSegment(index)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <div className="space-x-2">
              {!editMode && (
                <Button variant="outline" onClick={handleSkip}>
                  Skip for Now
                </Button>
              )}
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!validateStep(2)}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Competitive Landscape & Unique Value */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Competitive Landscape & Unique Value</CardTitle>
            <CardDescription>
              Optional: Provide competitive insights for more strategic recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="description">Business Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Tell us what this company does, their mission, and key offerings..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="uniqueValue">Unique Value Proposition (Optional)</Label>
              <Textarea
                id="uniqueValue"
                placeholder="What makes this company unique? What's their competitive advantage?"
                value={formData.uniqueValue}
                onChange={(e) => handleInputChange('uniqueValue', e.target.value)}
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div>
              <Label htmlFor="competitors">Key Competitors (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="competitors"
                  placeholder="Add a competitor"
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
                />
                <Button type="button" onClick={addCompetitor} size="sm">
                  Add
                </Button>
              </div>
              {competitors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {competitors.map((competitor, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {competitor}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeCompetitor(index)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="brandVoice">Brand Voice & Tone (Optional)</Label>
              <Input
                id="brandVoice"
                placeholder="e.g., Professional, Friendly, Innovative, Trustworthy"
                value={formData.brandVoice}
                onChange={(e) => handleInputChange('brandVoice', e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Back
            </Button>
            <div className="space-x-2">
              {!editMode && (
                <Button variant="outline" onClick={handleSkip}>
                  Skip & Create
                </Button>
              )}
              <Button onClick={handleSubmit} disabled={loading}>
                {loading
                  ? (editMode ? 'Updating...' : 'Creating...')
                  : (editMode ? 'Update Client' : 'Create Client with Context')
                }
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}