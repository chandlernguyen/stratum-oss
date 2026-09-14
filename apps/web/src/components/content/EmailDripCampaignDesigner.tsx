import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Target, Clock, Users, MessageCircle } from 'lucide-react';

export interface EmailDripCampaignData {
  campaignName: string;
  targetAudience: string;
  campaignGoal: string;
  numberOfEmails: number;
  sendFrequency: string;
}

interface EmailDripCampaignDesignerProps {
  onSubmit: (data: EmailDripCampaignData) => void;
  isLoading?: boolean;
  initialValues?: Partial<EmailDripCampaignData>;
  suggestedAudiences?: string[];
  suggestedGoals?: string[];
}

export function EmailDripCampaignDesigner({
  onSubmit,
  isLoading,
  initialValues,
  suggestedAudiences = [],
  suggestedGoals = []
}: EmailDripCampaignDesignerProps) {
  const [formData, setFormData] = useState<EmailDripCampaignData>({
    campaignName: initialValues?.campaignName || '',
    targetAudience: initialValues?.targetAudience || '',
    campaignGoal: initialValues?.campaignGoal || '',
    numberOfEmails: initialValues?.numberOfEmails || 5,
    sendFrequency: initialValues?.sendFrequency || 'weekly'
  });

  // Update form when initialValues change (async data arrives)
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        campaignName: initialValues.campaignName || prev.campaignName,
        targetAudience: initialValues.targetAudience || prev.targetAudience,
        campaignGoal: initialValues.campaignGoal || prev.campaignGoal,
        numberOfEmails: initialValues.numberOfEmails || prev.numberOfEmails,
        sendFrequency: initialValues.sendFrequency || prev.sendFrequency
      }));
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'every-other-day', label: 'Every Other Day' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const campaignGoalExamples = [
    'Lead nurturing and qualification',
    'Product onboarding and adoption',
    'Customer retention and upselling',
    'Event promotion and registration',
    'Educational content series',
    'Product launch announcement',
    'Re-engagement campaign',
    'Trial conversion'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-info" />
            Email Drip Campaign Designer
          </CardTitle>
          <CardDescription>
            Create strategic email sequences that nurture leads and drive conversions through targeted messaging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign Name *</Label>
            <Input
              id="campaignName"
              value={formData.campaignName}
              onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
              placeholder="e.g., Product Onboarding Series, Lead Nurture Campaign"
              required
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Target Audience *
            </Label>
            <Textarea
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="Describe your target audience: demographics, role, interests, pain points..."
              rows={3}
              required
            />
            {suggestedAudiences.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestedAudiences.slice(0, 3).map((audience, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    onClick={() => setFormData(prev => ({ ...prev, targetAudience: audience }))}
                  >
                    {audience}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Campaign Goal */}
          <div className="space-y-2">
            <Label htmlFor="campaignGoal" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Campaign Goal *
            </Label>
            <Textarea
              id="campaignGoal"
              value={formData.campaignGoal}
              onChange={(e) => setFormData(prev => ({ ...prev, campaignGoal: e.target.value }))}
              placeholder="What specific outcome do you want to achieve with this email sequence?"
              rows={3}
              required
            />
            <div className="text-sm text-brand-slate mt-1">
              <span className="font-medium">Examples:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {campaignGoalExamples.slice(0, 4).map((goal, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => setFormData(prev => ({ ...prev, campaignGoal: goal }))}
                  >
                    {goal}
                  </Badge>
                ))}
              </div>
            </div>
            {suggestedGoals.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestedGoals.map((goal, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    onClick={() => setFormData(prev => ({ ...prev, campaignGoal: goal }))}
                  >
                    {goal}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Campaign Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfEmails" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Number of Emails
              </Label>
              <Input
                id="numberOfEmails"
                type="number"
                min="3"
                max="15"
                value={formData.numberOfEmails}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  numberOfEmails: parseInt(e.target.value) || 5
                }))}
              />
              <div className="text-sm text-brand-slate">
                Recommended: 5-8 emails for optimal engagement
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sendFrequency" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Send Frequency
              </Label>
              <Select
                value={formData.sendFrequency}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, sendFrequency: value }))
                }
              >
                <SelectTrigger id="sendFrequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-brand-slate">
                Weekly is optimal for most B2B campaigns
              </div>
            </div>
          </div>

          {/* Campaign Preview Info */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-medium text-brand-charcoal mb-2">Campaign Overview</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-brand-info font-medium">Duration:</span>{' '}
                <span className="text-brand-info">
                  {formData.sendFrequency === 'daily' ? formData.numberOfEmails :
                   formData.sendFrequency === 'every-other-day' ? formData.numberOfEmails * 2 :
                   formData.sendFrequency === 'weekly' ? formData.numberOfEmails :
                   formData.sendFrequency === 'bi-weekly' ? formData.numberOfEmails * 2 :
                   formData.numberOfEmails * 4}
                  {formData.sendFrequency === 'daily' ? ' days' :
                   formData.sendFrequency === 'every-other-day' ? ' days' :
                   formData.sendFrequency === 'weekly' ? ' weeks' :
                   formData.sendFrequency === 'bi-weekly' ? ' weeks' :
                   ' weeks'}
                </span>
              </div>
              <div>
                <span className="text-brand-info font-medium">Total Emails:</span>{' '}
                <span className="text-brand-info">{formData.numberOfEmails}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg" className="w-full md:w-auto min-h-12 md:min-h-11">
          {isLoading ? 'Designing Campaign...' : 'Design Email Drip Campaign'}
        </Button>
      </div>
    </form>
  );
}