import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building, Globe, TrendingUp, DollarSign, Users, Target, Cpu, Briefcase, RefreshCw } from 'lucide-react';
import { useBusinessIntelligence, useBusinessDropdownOptions, useUpdateBusinessData } from '@/hooks/data/useBusinessIntelligence';

interface CoreBusinessData {
  id?: string;
  org_id: string;
  company_name: string;
  website?: string;
  industry?: string;
  company_size?: string;
  geography?: string[];
  business_model?: string;
  company_stage?: string;
  funding_status?: string;
  target_market?: string[];
  main_products?: string[];
  key_competitors?: string[];
  tech_stack?: string[];
  annual_revenue?: string;
  marketing_budget?: string;
  data_completeness_score?: number;
}

interface BusinessDataEditorProps {
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onRefresh?: () => void;
  clientId?: string | null;
}

export function BusinessDataEditor({ isEditing: _externalIsEditing, onEditingChange: _onEditingChange, onRefresh, clientId }: BusinessDataEditorProps) {
  const [editedData, setEditedData] = useState<CoreBusinessData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Local input states for array fields (to allow spaces while typing)
  const [targetMarketInput, setTargetMarketInput] = useState('');
  const [mainProductsInput, setMainProductsInput] = useState('');
  const [keyCompetitorsInput, setKeyCompetitorsInput] = useState('');
  const [techStackInput, setTechStackInput] = useState('');

  // Use hooks for data access with client context
  const { data: businessIntelligence, isLoading: businessLoading, refetch: refetchBusiness } = useBusinessIntelligence(clientId);
  const { data: dropdownOptions, isLoading: optionsLoading } = useBusinessDropdownOptions();
  const updateBusinessData = useUpdateBusinessData();

  const businessData = businessIntelligence?.core_data;
  const loading = businessLoading || optionsLoading;

  // Set edited data when business data changes
  useEffect(() => {
    if (businessData) {
      setEditedData(businessData);
      // Initialize input fields from array data
      setTargetMarketInput(businessData.target_market?.join(', ') || '');
      setMainProductsInput(businessData.main_products?.join(', ') || '');
      setKeyCompetitorsInput(businessData.key_competitors?.join(', ') || '');
      setTechStackInput(businessData.tech_stack?.join(', ') || '');
    }
  }, [businessData]);

  // Process array input on blur (allows spaces while typing)
  const handleArrayInputBlur = (field: keyof CoreBusinessData, value: string) => {
    if (!editedData) return;
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setEditedData({
      ...editedData,
      [field]: items,
    });
  };

  const handleGeographyToggle = (location: string) => {
    if (!editedData) return;

    const currentGeography = editedData.geography || [];
    const updated = currentGeography.includes(location)
      ? currentGeography.filter(loc => loc !== location)
      : [...currentGeography, location];

    setEditedData({
      ...editedData,
      geography: updated,
    });
  };

  const handleSave = async () => {
    if (!editedData) return;

    try {
      await updateBusinessData.mutateAsync(editedData);
      setIsEditing(false);
      refetchBusiness();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error saving business data:', error);
    }
  };

  const handleCancel = () => {
    setEditedData(businessData);
    // Reset input fields to original values
    setTargetMarketInput(businessData?.target_market?.join(', ') || '');
    setMainProductsInput(businessData?.main_products?.join(', ') || '');
    setKeyCompetitorsInput(businessData?.key_competitors?.join(', ') || '');
    setTechStackInput(businessData?.tech_stack?.join(', ') || '');
    setIsEditing(false);
  };

  if (loading || !businessData || !dropdownOptions) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Building className="w-4 h-4 md:w-5 md:h-5 text-brand-gold dark:text-amber-400" />
            Core Business Data
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm text-brand-slate dark:text-gray-400">Completeness</span>
              <Progress value={businessData.data_completeness_score || 0} className="w-20 md:w-24" />
              <span className="text-xs md:text-sm font-medium text-brand-charcoal dark:text-gray-100">{businessData.data_completeness_score || 0}%</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} className="min-w-[44px] min-h-[44px]">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">Edit</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">Cancel</Button>
                  <Button onClick={handleSave} disabled={updateBusinessData.isPending} className="flex-1 sm:flex-none">
                    {updateBusinessData.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Core Company Information */}
        <div className="space-y-4">
          <h3 className="text-xs md:text-sm font-semibold text-brand-charcoal dark:text-gray-300 uppercase tracking-wide">Company Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">
              Company Name *
              <span className="text-xs text-muted-foreground ml-2">(Business/Marketing name)</span>
            </Label>
            <Input
              id="company_name"
              value={editedData?.company_name || ''}
              onChange={(e) => setEditedData({ ...editedData!, company_name: e.target.value })}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={editedData?.website || ''}
              onChange={(e) => setEditedData({ ...editedData!, website: e.target.value })}
              disabled={!isEditing}
              placeholder="https://example.com"
            />
          </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="space-y-4">
          <h3 className="text-xs md:text-sm font-semibold text-brand-charcoal dark:text-gray-300 uppercase tracking-wide">Company Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="industry" className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              Industry
            </Label>
            <Select
              value={editedData?.industry || ''}
              onValueChange={(value) => setEditedData({ ...editedData!, industry: value })}
              disabled={!isEditing}
            >
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {dropdownOptions.industry.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_size" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Company Size
            </Label>
            <Select
              value={editedData?.company_size || ''}
              onValueChange={(value) => setEditedData({ ...editedData!, company_size: value })}
              disabled={!isEditing}
            >
              <SelectTrigger id="company_size">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {dropdownOptions.company_size.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_model" className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              Business Model
            </Label>
            <Select
              value={editedData?.business_model || ''}
              onValueChange={(value) => setEditedData({ ...editedData!, business_model: value })}
              disabled={!isEditing}
            >
              <SelectTrigger id="business_model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {dropdownOptions.business_model.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_stage" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Company Stage
            </Label>
            <Select
              value={editedData?.company_stage || ''}
              onValueChange={(value) => setEditedData({ ...editedData!, company_stage: value })}
              disabled={!isEditing}
            >
              <SelectTrigger id="company_stage">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {dropdownOptions.company_stage.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="funding_status" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Funding Status
            </Label>
            <Select
              value={editedData?.funding_status || ''}
              onValueChange={(value) => setEditedData({ ...editedData!, funding_status: value })}
              disabled={!isEditing}
            >
              <SelectTrigger id="funding_status">
                <SelectValue placeholder="Select funding" />
              </SelectTrigger>
              <SelectContent>
                {dropdownOptions.funding_status.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annual_revenue" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Annual Revenue
            </Label>
            <Select
              value={editedData?.annual_revenue || ''}
              onValueChange={(value) => setEditedData({ ...editedData!, annual_revenue: value })}
              disabled={!isEditing}
            >
              <SelectTrigger id="annual_revenue">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {dropdownOptions.revenue_ranges.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketing_budget" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Marketing Budget
            </Label>
            <Select
              value={editedData?.marketing_budget || ''}
              onValueChange={(value) => setEditedData({ ...editedData!, marketing_budget: value })}
              disabled={!isEditing}
            >
              <SelectTrigger id="marketing_budget">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {dropdownOptions.budget_ranges.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
        </div>

        {/* Geographic Presence */}
        <div className="space-y-4">
          <h3 className="text-xs md:text-sm font-semibold text-brand-charcoal dark:text-gray-300 uppercase tracking-wide">Geographic Presence</h3>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Operating Regions
            </Label>
          <div className="flex flex-wrap gap-2 p-3 border rounded-md">
            {isEditing ? (
              dropdownOptions.geography.map((location) => (
                <Badge
                  key={location}
                  variant={editedData?.geography?.includes(location) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleGeographyToggle(location)}
                >
                  {location}
                </Badge>
              ))
            ) : (
              editedData?.geography?.map((location) => (
                <Badge key={location} variant="default">
                  {location}
                </Badge>
              )) || <span className="text-muted-foreground">No locations selected</span>
            )}
          </div>
          </div>
        </div>

        {/* Market & Competition */}
        <div className="space-y-4">
          <h3 className="text-xs md:text-sm font-semibold text-brand-charcoal dark:text-gray-300 uppercase tracking-wide">Market & Competition</h3>

          <div className="space-y-2">
            <Label htmlFor="target_market" className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              Target Market Segments
              <span className="text-xs text-muted-foreground ml-2">(Comma-separated)</span>
            </Label>
            <Input
              id="target_market"
              value={isEditing ? targetMarketInput : editedData?.target_market?.join(', ') || ''}
              onChange={(e) => setTargetMarketInput(e.target.value)}
              onBlur={(e) => handleArrayInputBlur('target_market', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., SME, Enterprise, Construction Vertical"
            />
            {!isEditing && editedData?.target_market && editedData.target_market.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {editedData.target_market.map((segment) => (
                  <Badge key={segment} variant="secondary" className="text-xs">
                    {segment}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="main_products" className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              Main Products/Services
              <span className="text-xs text-muted-foreground ml-2">(Comma-separated)</span>
            </Label>
            <Input
              id="main_products"
              value={isEditing ? mainProductsInput : editedData?.main_products?.join(', ') || ''}
              onChange={(e) => setMainProductsInput(e.target.value)}
              onBlur={(e) => handleArrayInputBlur('main_products', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., Project Management Software, Analytics Dashboard"
            />
            {!isEditing && editedData?.main_products && editedData.main_products.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {editedData.main_products.map((product) => (
                  <Badge key={product} className="text-xs bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300">
                    {product}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_competitors" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Key Competitors
              <span className="text-xs text-muted-foreground ml-2">(Comma-separated)</span>
            </Label>
            <Input
              id="key_competitors"
              value={isEditing ? keyCompetitorsInput : editedData?.key_competitors?.join(', ') || ''}
              onChange={(e) => setKeyCompetitorsInput(e.target.value)}
              onBlur={(e) => handleArrayInputBlur('key_competitors', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., Asana, Monday.com, Trello"
            />
            {!isEditing && editedData?.key_competitors && editedData.key_competitors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {editedData.key_competitors.map((competitor) => (
                  <Badge key={competitor} variant="outline" className="text-xs">
                    {competitor}
                  </Badge>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Technology & Infrastructure */}
        <div className="space-y-4">
          <h3 className="text-xs md:text-sm font-semibold text-brand-charcoal dark:text-gray-300 uppercase tracking-wide">Technology & Infrastructure</h3>
          <div className="space-y-2">
            <Label htmlFor="tech_stack" className="flex items-center gap-1">
              <Cpu className="h-4 w-4" />
              Technology Stack
              <span className="text-xs text-muted-foreground ml-2">(Comma-separated)</span>
            </Label>
            <Input
              id="tech_stack"
              value={isEditing ? techStackInput : editedData?.tech_stack?.join(', ') || ''}
              onChange={(e) => setTechStackInput(e.target.value)}
              onBlur={(e) => handleArrayInputBlur('tech_stack', e.target.value)}
              disabled={!isEditing}
              placeholder="React, Python, AWS, PostgreSQL"
            />
            {!isEditing && editedData?.tech_stack && editedData.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {editedData.tech_stack.map((tech) => (
                  <Badge key={tech} className="text-xs bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}