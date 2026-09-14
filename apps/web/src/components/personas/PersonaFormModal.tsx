import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { personasAPI } from '@/lib/api-client';
import { PersonaInsightsPanel } from './PersonaInsightsPanel';
import { INDUSTRIES } from '@/config/businessConstants';

interface PersonaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  persona?: any; // Edit mode
  initialData?: any; // From chat generation
}

export function PersonaFormModal({
  isOpen,
  onClose,
  onSave,
  persona,
  initialData
}: PersonaFormModalProps) {
  const { t } = useTranslation('agents');
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    company_name: '',
    industry: '',
    vertical: '',
    location: '',
    company_size: '',
    annual_revenue: '',
    customer_status: 'prospect',
    satisfaction_score: 5,
    background_story: '',
    quote: '',
    response_style: 'professional',
    // Arrays
    goals: [] as string[],
    pain_points: [] as string[],
    jobs_to_be_done: [] as string[],
    current_tools: [] as string[],
    objections: [] as string[],
    preferred_channels: [] as string[],
    tags: [] as string[],
    // Objects
    demographics: {
      age: '' as any, // Will be converted to number or null when submitting
      education: '',
      tech_savviness: 'moderate',
      years_experience: '' as any // Will be converted to number or null when submitting
    },
    personality_traits: {
      risk_tolerance: 'medium',
      innovation_appetite: 'moderate',
      decision_speed: 'deliberate'
    },
    decision_criteria: {} as Record<string, string>
  });

  const [newItem, setNewItem] = useState('');
  const [currentSection, setCurrentSection] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (persona) {
      // Edit mode - merge with default structure and convert null values to empty strings
      const cleanPersona = {
        ...persona,
        name: persona.name || '',
        title: persona.title || '',
        company_name: persona.company_name || '',
        industry: persona.industry || '',
        vertical: persona.vertical || '',
        location: typeof persona.location === 'object' 
          ? [persona.location.city, persona.location.state_province, persona.location.country]
              .filter(Boolean).join(', ') || ''
          : persona.location || '',
        company_size: persona.company_size || '',
        annual_revenue: persona.annual_revenue || '',
        background_story: persona.background_story || '',
        quote: persona.key_quote || '',
        response_style: persona.response_style || 'professional',
        customer_status: persona.customer_status || 'prospect',
        satisfaction_score: persona.satisfaction_score || 5
      };
      
      setFormData(prev => ({
        ...prev,
        ...cleanPersona,
        // Load arrays from database
        goals: Array.isArray(persona.goals) ? persona.goals : [],
        pain_points: Array.isArray(persona.pain_points) ? persona.pain_points : [],
        jobs_to_be_done: Array.isArray(persona.jobs_to_be_done) ? persona.jobs_to_be_done : [],
        current_tools: Array.isArray(persona.current_tools) ? persona.current_tools : [],
        objections: Array.isArray(persona.objections) ? persona.objections : [],
        // Load nested objects from database with null handling
        demographics: {
          ...(persona.demographics || {}),
          // Convert null values to empty strings
          age: persona.demographics?.age || '',
          education: persona.demographics?.education || '',
          tech_savviness: persona.demographics?.tech_savviness || 'moderate',
          years_experience: persona.demographics?.years_experience || persona.demographics?.experience_years || '',
          family_status: persona.demographics?.family_status || '',
        },
        personality_traits: {
          // Set defaults first
          risk_tolerance: persona.personality_traits?.risk_tolerance || 'medium',
          innovation_appetite: persona.personality_traits?.innovation_appetite || 'moderate',
          decision_speed: persona.personality_traits?.decision_speed || 'deliberate',
          decision_style: persona.personality_traits?.decision_style || 'deliberate',
          // Then spread any other properties
          ...(persona.personality_traits || {}),
        },
        decision_criteria: {
          ...(persona.decision_criteria || {}),
          // Handle arrays and null values
          price_sensitivity: persona.decision_criteria?.price_sensitivity || '',
          key_factors: Array.isArray(persona.decision_criteria?.key_factors) ? persona.decision_criteria.key_factors : [],
        }
      }));
    } else if (initialData) {
      // From chat generation
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [persona, initialData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof typeof prev] as any),
        [field]: value
      }
    }));
  };

  const addToArray = (field: string) => {
    if (newItem.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof typeof prev] as string[] || []), newItem.trim()]
      }));
      setNewItem('');
    }
  };

  const removeFromArray = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Clean up data before sending - convert empty strings to null for numeric fields
      const cleanedData = {
        ...formData,
        demographics: {
          ...formData.demographics,
          age: formData.demographics?.age ? parseInt(formData.demographics.age) : null,
          years_experience: formData.demographics?.years_experience ? parseInt(formData.demographics.years_experience) : null
        },
        satisfaction_score: formData.satisfaction_score || null,
        // Ensure arrays are not undefined
        goals: formData.goals || [],
        pain_points: formData.pain_points || [],
        jobs_to_be_done: formData.jobs_to_be_done || [],
        current_tools: formData.current_tools || [],
        objections: formData.objections || [],
        preferred_channels: formData.preferred_channels || [],
        tags: formData.tags || [],
        // Ensure objects are not undefined
        decision_criteria: formData.decision_criteria || {},
        personality_traits: {
          // Spread form data first, then ensure defaults for required fields
          ...formData.personality_traits,
          risk_tolerance: formData.personality_traits?.risk_tolerance || 'medium',
          innovation_appetite: formData.personality_traits?.innovation_appetite || 'moderate',
          decision_speed: formData.personality_traits?.decision_speed || 'deliberate',
        },
        // Remove domain_expertise if it doesn't exist in formData
        domain_expertise: {}
      };

      if (persona?.id) {
        const response = await personasAPI.update(persona.id, cleanedData);
        if (!response.success) {
          throw new Error(response.message || 'Failed to update persona');
        }
      } else {
        const response = await personasAPI.create(cleanedData);
        if (!response.success) {
          throw new Error(response.message || 'Failed to create persona');
        }
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving persona:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verticalOptions = [
    'Construction',
    'Manufacturing',
    'Healthcare',
    'Finance',
    'Retail',
    'Technology',
    'Education',
    'Other'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {persona ? t('personas.form.editTitle') : t('personas.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {persona ? t('personas.form.editDescription') : t('personas.form.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className={`grid w-full ${persona ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="basic">{t('personas.form.tabs.basicInfo')}</TabsTrigger>
            <TabsTrigger value="goals">{t('personas.form.tabs.goalsPainPoints')}</TabsTrigger>
            <TabsTrigger value="tools">{t('personas.form.tabs.toolsWorkflow')}</TabsTrigger>
            <TabsTrigger value="personality">{t('personas.form.tabs.personality')}</TabsTrigger>
            {persona && <TabsTrigger value="insights">{t('personas.form.tabs.insights')}</TabsTrigger>}
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t('personas.form.fields.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('personas.form.placeholders.name')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="title">{t('personas.form.fields.title')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder={t('personas.form.placeholders.title')}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="company_name">{t('personas.form.fields.companyName')} *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder={t('personas.form.placeholders.companyName')}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">{t('personas.form.fields.industry')} *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => handleInputChange('industry', value)}
                >
                  <SelectTrigger id="industry">
                    <SelectValue placeholder={t('personas.form.placeholders.selectIndustry')} />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vertical">{t('personas.form.fields.vertical')}</Label>
                <Select
                  value={formData.vertical}
                  onValueChange={(value) => handleInputChange('vertical', value)}
                >
                  <SelectTrigger id="vertical">
                    <SelectValue placeholder={t('personas.form.placeholders.selectVertical')} />
                  </SelectTrigger>
                  <SelectContent>
                    {verticalOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">{t('personas.form.fields.location')}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder={t('personas.form.placeholders.location')}
                />
              </div>
              <div>
                <Label htmlFor="company_size">{t('personas.form.fields.companySize')}</Label>
                <Input
                  id="company_size"
                  value={formData.company_size}
                  onChange={(e) => handleInputChange('company_size', e.target.value)}
                  placeholder={t('personas.form.placeholders.companySize')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_status">{t('personas.form.fields.customerStatus')}</Label>
                <Select
                  value={formData.customer_status}
                  onValueChange={(value) => handleInputChange('customer_status', value)}
                >
                  <SelectTrigger id="customer_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">{t('personas.form.customerStatuses.prospect')}</SelectItem>
                    <SelectItem value="active">{t('personas.form.customerStatuses.active')}</SelectItem>
                    <SelectItem value="churned">{t('personas.form.customerStatuses.churned')}</SelectItem>
                    <SelectItem value="competitor_user">{t('personas.form.customerStatuses.competitorUser')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="satisfaction_score">
                  {t('personas.form.fields.satisfactionScore')}: {formData.satisfaction_score}
                </Label>
                <input
                  id="satisfaction_score"
                  type="range"
                  min="1"
                  max="10"
                  value={formData.satisfaction_score}
                  onChange={(e) => handleInputChange('satisfaction_score', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="background_story">{t('personas.form.fields.backgroundStory')}</Label>
              <Textarea
                id="background_story"
                value={formData.background_story}
                onChange={(e) => handleInputChange('background_story', e.target.value)}
                placeholder={t('personas.form.placeholders.backgroundStory')}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="quote">{t('personas.form.fields.characteristicQuote')}</Label>
              <Input
                id="quote"
                value={formData.quote || ''}
                onChange={(e) => handleInputChange('quote', e.target.value)}
                placeholder={t('personas.form.placeholders.characteristicQuote')}
              />
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            {['goals', 'pain_points', 'jobs_to_be_done', 'objections'].map((field) => (
              <div key={field}>
                <Label>{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={currentSection === field ? newItem : ''}
                    onChange={(e) => {
                      setNewItem(e.target.value);
                      setCurrentSection(field);
                    }}
                    placeholder={`Add ${field.replace(/_/g, ' ')}...`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(field);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setCurrentSection(field);
                      addToArray(field);
                    }}
                    size="icon"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData[field as keyof typeof formData] as string[])?.map((item, index) => (
                    <Badge key={index} variant="secondary">
                      {item}
                      <button
                        onClick={() => removeFromArray(field, index)}
                        className="ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            {['current_tools', 'preferred_channels'].map((field) => (
              <div key={field}>
                <Label>{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={currentSection === field ? newItem : ''}
                    onChange={(e) => {
                      setNewItem(e.target.value);
                      setCurrentSection(field);
                    }}
                    placeholder={`Add ${field.replace(/_/g, ' ')}...`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(field);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setCurrentSection(field);
                      addToArray(field);
                    }}
                    size="icon"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData[field as keyof typeof formData] as string[])?.map((item, index) => (
                    <Badge key={index} variant="secondary">
                      {item}
                      <button
                        onClick={() => removeFromArray(field, index)}
                        className="ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="personality" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tech_savviness">{t('personas.form.fields.techSavviness')}</Label>
                <Textarea
                  id="tech_savviness"
                  value={formData.demographics?.tech_savviness || ''}
                  onChange={(e) => handleNestedChange('demographics', 'tech_savviness', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="risk_tolerance">{t('personas.form.fields.riskTolerance')}</Label>
                <Input
                  id="risk_tolerance"
                  value={formData.personality_traits?.risk_tolerance || ''}
                  onChange={(e) => handleNestedChange('personality_traits', 'risk_tolerance', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="innovation_appetite">{t('personas.form.fields.innovationAppetite')}</Label>
                <Textarea
                  id="innovation_appetite"
                  value={formData.personality_traits?.innovation_appetite || ''}
                  onChange={(e) => handleNestedChange('personality_traits', 'innovation_appetite', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="response_style">{t('personas.form.fields.responseStyle')}</Label>
                <Select
                  value={formData.response_style}
                  onValueChange={(value) => handleInputChange('response_style', value)}
                >
                  <SelectTrigger id="response_style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">{t('personas.form.responseStyles.casual')}</SelectItem>
                    <SelectItem value="professional">{t('personas.form.responseStyles.professional')}</SelectItem>
                    <SelectItem value="technical">{t('personas.form.responseStyles.technical')}</SelectItem>
                    <SelectItem value="executive">{t('personas.form.responseStyles.executive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('personas.form.fields.tags')}</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={currentSection === 'tags' ? newItem : ''}
                  onChange={(e) => {
                    setNewItem(e.target.value);
                    setCurrentSection('tags');
                  }}
                  placeholder={t('personas.form.placeholders.addTag')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addToArray('tags');
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    setCurrentSection('tags');
                    addToArray('tags');
                  }}
                  size="icon"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag, index) => (
                  <Badge key={index}>
                    {tag}
                    <button
                      onClick={() => removeFromArray('tags', index)}
                      className="ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Insights Tab - Only shown in edit mode */}
          {persona && (
            <TabsContent value="insights" className="space-y-4">
              <div className="text-sm text-brand-slate mb-2">
                {t('personas.form.insightsDescription')}
              </div>
              <PersonaInsightsPanel
                personas={[persona]}
                selectedPersonaId={persona.id}
              />
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('personas.form.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t('personas.form.saving') : t('personas.form.savePersona')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}