import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Zap, Trophy, Shield, Target } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export interface USPContentFormData {
  productService: string;
  primaryUSP: string;
  supportingUSPs: string[];
  contentType: 'case-study' | 'comparison' | 'feature-spotlight' | 'success-story' | 'demo-video-script';
  targetPainPoint: string;
  competitorComparison: boolean;
  competitors: string[];
  customerProof: string[];
  valueMetrics: string[];
  emotionalHook: string;
  includeTestimonials: boolean;
  includeStats: boolean;
  callToAction: string;
}

interface USPContentFormProps {
  onSubmit: (data: USPContentFormData) => void;
  isLoading?: boolean;
  initialValues?: Partial<USPContentFormData>;
  suggestedUSPs?: string[];
  knownCompetitors?: string[];
}

export function USPContentForm({
  onSubmit,
  isLoading,
  initialValues,
  suggestedUSPs = [],
  knownCompetitors = []
}: USPContentFormProps) {
  const [formData, setFormData] = useState<USPContentFormData>({
    productService: initialValues?.productService || '',
    primaryUSP: initialValues?.primaryUSP || '',
    supportingUSPs: initialValues?.supportingUSPs || [],
    contentType: initialValues?.contentType || 'case-study',
    targetPainPoint: initialValues?.targetPainPoint || '',
    competitorComparison: initialValues?.competitorComparison ?? false,
    competitors: initialValues?.competitors || [],
    customerProof: initialValues?.customerProof || [],
    valueMetrics: initialValues?.valueMetrics || [],
    emotionalHook: initialValues?.emotionalHook || '',
    includeTestimonials: initialValues?.includeTestimonials ?? true,
    includeStats: initialValues?.includeStats ?? true,
    callToAction: initialValues?.callToAction || ''
  });

  const [newUSP, setNewUSP] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');
  const [newProof, setNewProof] = useState('');
  const [newMetric, setNewMetric] = useState('');

  // Update form when initialValues change (async data arrives)
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        productService: initialValues.productService || prev.productService,
        primaryUSP: initialValues.primaryUSP || prev.primaryUSP,
        supportingUSPs: initialValues.supportingUSPs || prev.supportingUSPs,
        contentType: initialValues.contentType || prev.contentType,
        targetPainPoint: initialValues.targetPainPoint || prev.targetPainPoint,
        competitorComparison: initialValues.competitorComparison ?? prev.competitorComparison,
        competitors: initialValues.competitors || prev.competitors,
        customerProof: initialValues.customerProof || prev.customerProof,
        valueMetrics: initialValues.valueMetrics || prev.valueMetrics,
        emotionalHook: initialValues.emotionalHook || prev.emotionalHook,
        includeTestimonials: initialValues.includeTestimonials ?? prev.includeTestimonials,
        includeStats: initialValues.includeStats ?? prev.includeStats,
        callToAction: initialValues.callToAction || prev.callToAction
      }));
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addUSP = () => {
    if (newUSP.trim()) {
      setFormData(prev => ({
        ...prev,
        supportingUSPs: [...prev.supportingUSPs, newUSP.trim()]
      }));
      setNewUSP('');
    }
  };

  const removeUSP = (index: number) => {
    setFormData(prev => ({
      ...prev,
      supportingUSPs: prev.supportingUSPs.filter((_, i) => i !== index)
    }));
  };

  const addCompetitor = () => {
    if (newCompetitor.trim()) {
      setFormData(prev => ({
        ...prev,
        competitors: [...prev.competitors, newCompetitor.trim()]
      }));
      setNewCompetitor('');
    }
  };

  const removeCompetitor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index)
    }));
  };

  const addProof = () => {
    if (newProof.trim()) {
      setFormData(prev => ({
        ...prev,
        customerProof: [...prev.customerProof, newProof.trim()]
      }));
      setNewProof('');
    }
  };

  const removeProof = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customerProof: prev.customerProof.filter((_, i) => i !== index)
    }));
  };

  const addMetric = () => {
    if (newMetric.trim()) {
      setFormData(prev => ({
        ...prev,
        valueMetrics: [...prev.valueMetrics, newMetric.trim()]
      }));
      setNewMetric('');
    }
  };

  const removeMetric = (index: number) => {
    setFormData(prev => ({
      ...prev,
      valueMetrics: prev.valueMetrics.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            USP-Focused Content Configuration
          </CardTitle>
          <CardDescription>
            Create compelling content that highlights your unique value proposition and competitive advantages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product/Service and Primary USP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productService">Product/Service Name *</Label>
              <Input
                id="productService"
                value={formData.productService}
                onChange={(e) => setFormData(prev => ({ ...prev, productService: e.target.value }))}
                placeholder="e.g., TaskFlow Pro"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type *</Label>
              <Select
                value={formData.contentType}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, contentType: value as USPContentFormData['contentType'] }))
                }
              >
                <SelectTrigger id="contentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="case-study">Case Study</SelectItem>
                  <SelectItem value="comparison">Comparison Guide</SelectItem>
                  <SelectItem value="feature-spotlight">Feature Spotlight</SelectItem>
                  <SelectItem value="success-story">Success Story</SelectItem>
                  <SelectItem value="demo-video-script">Demo Video Script</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Primary USP */}
          <div className="space-y-2">
            <Label htmlFor="primaryUSP" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Primary Unique Selling Proposition *
            </Label>
            <Textarea
              id="primaryUSP"
              value={formData.primaryUSP}
              onChange={(e) => setFormData(prev => ({ ...prev, primaryUSP: e.target.value }))}
              placeholder="What makes your product/service uniquely valuable?"
              rows={2}
              required
            />
            {suggestedUSPs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestedUSPs.slice(0, 3).map((usp, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-orange-50"
                    onClick={() => setFormData(prev => ({ ...prev, primaryUSP: usp }))}
                  >
                    {usp}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Supporting USPs */}
          <div className="space-y-2">
            <Label>Supporting USPs</Label>
            <div className="flex gap-2">
              <Input
                value={newUSP}
                onChange={(e) => setNewUSP(e.target.value)}
                placeholder="Add a supporting USP"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUSP())}
                className="min-h-12 md:min-h-10"
              />
              <Button type="button" onClick={addUSP} size="icon" variant="secondary" className="min-w-12 min-h-12 md:min-w-10 md:min-h-10">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.supportingUSPs.map((usp, i) => (
                <Badge key={i} className="flex items-center gap-1">
                  {usp}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeUSP(i)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Target Pain Point */}
          <div className="space-y-2">
            <Label htmlFor="targetPainPoint" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target Pain Point *
            </Label>
            <Textarea
              id="targetPainPoint"
              value={formData.targetPainPoint}
              onChange={(e) => setFormData(prev => ({ ...prev, targetPainPoint: e.target.value }))}
              placeholder="What specific problem does this solve for your customers?"
              rows={2}
              required
            />
          </div>

          {/* Competitor Comparison Section */}
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="competitorComparison" className="cursor-pointer">
                Include Competitor Comparison
              </Label>
              <Switch
                id="competitorComparison"
                checked={formData.competitorComparison}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, competitorComparison: checked }))
                }
              />
            </div>

            {formData.competitorComparison && (
              <div className="space-y-2">
                <Label>Competitors to Compare</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    placeholder="Add a competitor"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
                    className="min-h-12 md:min-h-10"
                  />
                  <Button type="button" onClick={addCompetitor} size="icon" variant="secondary" className="min-w-12 min-h-12 md:min-w-10 md:min-h-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {knownCompetitors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {knownCompetitors.map((comp, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => addCompetitor()}
                      >
                        {comp}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.competitors.map((comp, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {comp}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeCompetitor(i)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer Proof Points */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Customer Proof Points
            </Label>
            <div className="flex gap-2">
              <Input
                value={newProof}
                onChange={(e) => setNewProof(e.target.value)}
                placeholder="e.g., 500+ customers, 99% satisfaction rate"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addProof())}
                className="min-h-12 md:min-h-10"
              />
              <Button type="button" onClick={addProof} size="icon" variant="secondary" className="min-w-12 min-h-12 md:min-w-10 md:min-h-10">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.customerProof.map((proof, i) => (
                <Badge key={i} variant="outline" className="flex items-center gap-1">
                  {proof}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeProof(i)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Value Metrics */}
          <div className="space-y-2">
            <Label>Value Metrics & ROI</Label>
            <div className="flex gap-2">
              <Input
                value={newMetric}
                onChange={(e) => setNewMetric(e.target.value)}
                placeholder="e.g., 50% time saved, 3x ROI"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMetric())}
                className="min-h-12 md:min-h-10"
              />
              <Button type="button" onClick={addMetric} size="icon" variant="secondary" className="min-w-12 min-h-12 md:min-w-10 md:min-h-10">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.valueMetrics.map((metric, i) => (
                <Badge key={i} className="flex items-center gap-1 bg-green-100 text-brand-success">
                  {metric}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeMetric(i)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Emotional Hook */}
          <div className="space-y-2">
            <Label htmlFor="emotionalHook">Emotional Hook</Label>
            <Input
              id="emotionalHook"
              value={formData.emotionalHook}
              onChange={(e) => setFormData(prev => ({ ...prev, emotionalHook: e.target.value }))}
              placeholder="e.g., Peace of mind, confidence, empowerment"
            />
          </div>

          {/* Options */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="includeTestimonials" className="cursor-pointer">
                Include Customer Testimonials
              </Label>
              <Switch
                id="includeTestimonials"
                checked={formData.includeTestimonials}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, includeTestimonials: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includeStats" className="cursor-pointer">
                Include Statistics & Data
              </Label>
              <Switch
                id="includeStats"
                checked={formData.includeStats}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, includeStats: checked }))
                }
              />
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-2">
            <Label htmlFor="callToAction">Call to Action *</Label>
            <Input
              id="callToAction"
              value={formData.callToAction}
              onChange={(e) => setFormData(prev => ({ ...prev, callToAction: e.target.value }))}
              placeholder="e.g., Start free trial, Book a demo, Download comparison guide"
              required
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg" className="w-full md:w-auto min-h-12 md:min-h-11">
          {isLoading ? 'Generating...' : 'Generate USP-Focused Content'}
        </Button>
      </div>
    </form>
  );
}