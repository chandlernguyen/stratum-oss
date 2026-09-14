import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AgentChat } from './AgentChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Rocket,
  Target,
  Settings,
  TrendingUp,
  DollarSign,
  Users,
  Megaphone,
  BarChart,
  Zap
} from 'lucide-react';
import { getLocalizedAgentPlaceholder } from '@/config/agentConfig';
import { buildAgentCampaignContext } from './campaignContext';

interface MarketingStrategyChatProps {
  campaignId?: string;
  organizationId?: string;
  existingPersonas?: any[];
  campaignData?: any;
  onStrategyGenerated?: (strategy: any) => void;
  preselectedMode?: 'quick' | 'guided' | 'advanced' | 'chat' | null;
  selectedSession?: any;
  onSessionCreated?: (session: any) => void;
  initialContext?: string;
}

type ApproachMode = 'quick' | 'guided' | 'advanced' | 'chat' | null;

export function MarketingStrategyChat({
  campaignData,
  preselectedMode,
  selectedSession,
  onSessionCreated,
  initialContext
}: MarketingStrategyChatProps) {
  const { t } = useTranslation(['agents', 'common']);
  console.log('[MarketingStrategyChat] Props:', {
    hasInitialContext: !!initialContext,
    initialContextLength: initialContext?.length,
    hasSelectedSession: !!selectedSession,
    sessionId: selectedSession?.id,
    preselectedMode
  });
  const [approachMode, setApproachMode] = useState<ApproachMode>(preselectedMode || null);
  const [quickStrategyParams, setQuickStrategyParams] = useState({
    budget: campaignData?.budget ? String(campaignData.budget) : '',
    goal: ''
  });
  const [showChat, setShowChat] = useState(false);

  // If mode is preselected or we have a selected session, set it immediately
  useEffect(() => {
    // If we have a selected session, go straight to chat
    if (selectedSession) {
      setShowChat(true);
      if (!approachMode && preselectedMode) {
        setApproachMode(preselectedMode);
      }
    } else if (preselectedMode && !approachMode) {
      setApproachMode(preselectedMode);
      // For guided, advanced, and chat modes, go straight to chat
      if (preselectedMode === 'guided' || preselectedMode === 'advanced' || preselectedMode === 'chat') {
        setShowChat(true);
      }
    }
    // If mode is 'chat', automatically show chat regardless of session
    if (preselectedMode === 'chat') {
      setShowChat(true);
    }
  }, [preselectedMode, selectedSession]);

  // Build campaign context string for the agent
  const campaignContext = buildAgentCampaignContext(
    campaignData,
    'Please align all marketing strategy recommendations with these campaign parameters.'
  );

  // Budget options for quick strategy
  const budgetOptions = [
    { value: '0', label: t('agents:marketing_strategy.page.budgetOptions.bootstrap'), icon: Zap },
    { value: '500', label: t('agents:marketing_strategy.page.budgetOptions.under500'), icon: DollarSign },
    { value: '2000', label: t('agents:marketing_strategy.page.budgetOptions.mid'), icon: TrendingUp },
    { value: '5000', label: t('agents:marketing_strategy.page.budgetOptions.high'), icon: Rocket }
  ];

  // Goal options for quick strategy
  const goalOptions = [
    { value: 'first_customers', label: t('agents:marketing_strategy.page.goalOptions.firstCustomers'), icon: Users },
    { value: 'brand_awareness', label: t('agents:marketing_strategy.page.goalOptions.brandAwareness'), icon: Megaphone },
    { value: 'lead_generation', label: t('agents:marketing_strategy.page.goalOptions.leadGeneration'), icon: Target },
    { value: 'product_launch', label: t('agents:marketing_strategy.page.goalOptions.productLaunch'), icon: Rocket }
  ];

  const handleQuickStrategy = () => {
    if (!quickStrategyParams.budget || !quickStrategyParams.goal) return;
    
    setShowChat(true);
    // Will trigger the initial message in the next render
  };

  const handleGuidedStrategy = () => {
    setShowChat(true);
    // Start with a guided conversation
  };

  const handleAdvancedStrategy = () => {
    setShowChat(true);
    // Jump straight to detailed configuration
  };

  // If chat is shown, render the agent chat interface
  if (showChat) {
    return (
      <div className="space-y-6">
        {/* Mode indicator - only show for non-chat modes */}
        {approachMode && approachMode !== 'chat' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {approachMode === 'quick' && t('agents:marketing_strategy.page.modes.quick')}
                {approachMode === 'guided' && t('agents:marketing_strategy.page.modes.guided')}
                {approachMode === 'advanced' && t('agents:marketing_strategy.page.modes.advanced')}
              </Badge>
            {approachMode === 'quick' && quickStrategyParams.budget && (
              <Badge variant="secondary">
                {t('agents:marketing_strategy.page.budget')}: ${quickStrategyParams.budget}/mo
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowChat(false);
              setApproachMode(null);
            }}
          >
            {t('agents:marketing_strategy.page.changeApproach')}
          </Button>
        </div>
        )}

        {/* Agent Chat */}
        <AgentChat
          agentType="marketing_strategy"
          agentName="Marketing Strategy Agent"
          mode={approachMode || undefined}
          placeholder={getLocalizedAgentPlaceholder('marketing_strategy')}
          contextInfo={campaignContext}
          selectedSession={selectedSession}
          onSessionCreated={onSessionCreated}
          initialMessage={initialContext || (approachMode === 'quick' && quickStrategyParams.budget && quickStrategyParams.goal ? 
            `Generate a marketing strategy for my business with the following parameters:\n\nMonthly Budget: $${quickStrategyParams.budget === '0' ? '0 (Bootstrap)' : quickStrategyParams.budget === '500' ? 'Under 500' : quickStrategyParams.budget === '2000' ? '500-2000' : '2000+'}\nPrimary Goal: ${quickStrategyParams.goal === 'first_customers' ? 'Get first customers' : quickStrategyParams.goal === 'brand_awareness' ? 'Increase brand awareness' : quickStrategyParams.goal === 'lead_generation' ? 'Generate leads' : 'Launch new product'}\n\nPlease provide a comprehensive marketing strategy that:\n1. Leverages any existing business intelligence and personas if available\n2. Maximizes ROI within my budget constraints\n3. Includes specific tactics and channels\n4. Provides messaging frameworks\n5. Offers actionable next steps` 
            : undefined)
          }
        />
      </div>
    );
  }

  // If we have preselected mode but haven't shown the right interface yet
  // Don't show the form if we have a selected session - go straight to chat
  if (preselectedMode && !showChat && approachMode && !selectedSession) {
    // For quick mode, show the quick strategy form
    if (approachMode === 'quick') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              {t('agents:marketing_strategy.page.quickStrategy.title')}
            </CardTitle>
            <CardDescription>
              {t('agents:marketing_strategy.page.quickStrategy.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  {t('agents:marketing_strategy.page.quickStrategy.budgetQuestion')}
                </Label>
                <RadioGroup 
                  value={quickStrategyParams.budget} 
                  onValueChange={(value) => setQuickStrategyParams(prev => ({ ...prev, budget: value }))}
                  className="grid grid-cols-2 gap-4"
                >
                  {budgetOptions.map(option => (
                    <div key={option.value}>
                      <RadioGroupItem value={option.value} id={`budget-${option.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`budget-${option.value}`}
                        className="flex items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-accent peer-data-[state=checked]:border-amber-600 peer-data-[state=checked]:bg-amber-50 dark:peer-data-[state=checked]:bg-amber-950/20"
                      >
                        <option.icon className="h-5 w-5" />
                        <span>{option.label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">
                  {t('agents:marketing_strategy.page.quickStrategy.goalQuestion')}
                </Label>
                <RadioGroup
                  value={quickStrategyParams.goal}
                  onValueChange={(value) => setQuickStrategyParams(prev => ({ ...prev, goal: value }))}
                  className="grid grid-cols-2 gap-4"
                >
                  {goalOptions.map(option => (
                    <div key={option.value}>
                      <RadioGroupItem value={option.value} id={`goal-${option.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`goal-${option.value}`}
                        className="flex items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-accent peer-data-[state=checked]:border-amber-600 peer-data-[state=checked]:bg-slate-50"
                      >
                        <option.icon className="h-5 w-5" />
                        <span>{option.label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <Button
              onClick={handleQuickStrategy}
              disabled={!quickStrategyParams.budget || !quickStrategyParams.goal}
              className="w-full h-12 text-base"
              size="lg"
            >
              <Rocket className="h-5 w-5 mr-2" />
              {t('agents:marketing_strategy.page.quickStrategy.generateButton')}
            </Button>
          </CardContent>
        </Card>
      );
    }
  }

  // Choice-driven interface (only show if no mode is preselected)
  if (!preselectedMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">{t('agents:marketing_strategy.page.header.title')}</h2>
          <p className="text-muted-foreground">
            {t('agents:marketing_strategy.page.header.description')}
          </p>
        </div>

        {/* Approach Selection */}
        <div className="grid gap-4 md:grid-cols-3">
        {/* Quick Strategy */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
          onClick={() => setApproachMode('quick')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Rocket className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              <Badge variant="secondary">{t('agents:marketing_strategy.page.badges.quick')}</Badge>
            </div>
            <CardTitle>{t('agents:marketing_strategy.page.quickStrategy.cardTitle')}</CardTitle>
            <CardDescription>
              {t('agents:marketing_strategy.page.quickStrategy.cardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• {t('agents:marketing_strategy.page.quickStrategy.features.smartBudget')}</li>
              <li>• {t('agents:marketing_strategy.page.quickStrategy.features.channelRecs')}</li>
              <li>• {t('agents:marketing_strategy.page.quickStrategy.features.messagingFramework')}</li>
              <li>• {t('agents:marketing_strategy.page.quickStrategy.features.readyTactics')}</li>
            </ul>
          </CardContent>
        </Card>

        {/* Guided Planning */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
          onClick={() => setApproachMode('guided')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Target className="h-8 w-8 text-green-500" />
              <Badge variant="secondary">{t('agents:marketing_strategy.page.badges.guided')}</Badge>
            </div>
            <CardTitle>{t('agents:marketing_strategy.page.guidedPlanning.cardTitle')}</CardTitle>
            <CardDescription>
              {t('agents:marketing_strategy.page.guidedPlanning.cardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• {t('agents:marketing_strategy.page.guidedPlanning.features.conversational')}</li>
              <li>• {t('agents:marketing_strategy.page.guidedPlanning.features.tailored')}</li>
              <li>• {t('agents:marketing_strategy.page.guidedPlanning.features.bestPractice')}</li>
              <li>• {t('agents:marketing_strategy.page.guidedPlanning.features.iterative')}</li>
            </ul>
          </CardContent>
        </Card>

        {/* Advanced Configuration */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
          onClick={() => setApproachMode('advanced')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Settings className="h-8 w-8 text-amber-500" />
              <Badge variant="secondary">{t('agents:marketing_strategy.page.badges.custom')}</Badge>
            </div>
            <CardTitle>{t('agents:marketing_strategy.page.advancedConfig.cardTitle')}</CardTitle>
            <CardDescription>
              {t('agents:marketing_strategy.page.advancedConfig.cardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• {t('agents:marketing_strategy.page.advancedConfig.features.multiPersona')}</li>
              <li>• {t('agents:marketing_strategy.page.advancedConfig.features.customChannel')}</li>
              <li>• {t('agents:marketing_strategy.page.advancedConfig.features.detailedBudget')}</li>
              <li>• {t('agents:marketing_strategy.page.advancedConfig.features.complexCampaigns')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Quick Strategy Form */}
      {approachMode === 'quick' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('agents:marketing_strategy.page.quickStrategy.title')}</CardTitle>
            <CardDescription>
              {t('agents:marketing_strategy.page.quickStrategy.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Budget Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {t('agents:marketing_strategy.page.quickStrategy.budgetQuestion')}
              </Label>
              <RadioGroup 
                value={quickStrategyParams.budget}
                onValueChange={(value) => 
                  setQuickStrategyParams(prev => ({ ...prev, budget: value }))
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  {budgetOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`budget-${option.value}`} />
                      <Label 
                        htmlFor={`budget-${option.value}`} 
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Goal Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {t('agents:marketing_strategy.page.quickStrategy.goalQuestion')}
              </Label>
              <RadioGroup
                value={quickStrategyParams.goal}
                onValueChange={(value) =>
                  setQuickStrategyParams(prev => ({ ...prev, goal: value }))
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  {goalOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`goal-${option.value}`} />
                      <Label
                        htmlFor={`goal-${option.value}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleQuickStrategy}
              disabled={!quickStrategyParams.budget || !quickStrategyParams.goal}
              className="w-full"
              size="lg"
            >
              <Rocket className="mr-2 h-4 w-4" />
              {t('agents:marketing_strategy.page.quickStrategy.generateButton')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Guided Planning Start */}
      {approachMode === 'guided' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('agents:marketing_strategy.page.guidedPlanning.title')}</CardTitle>
            <CardDescription>
              {t('agents:marketing_strategy.page.guidedPlanning.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('agents:marketing_strategy.page.guidedPlanning.explanation')}
              </p>
              <Button onClick={handleGuidedStrategy} className="w-full" size="lg">
                <Target className="mr-2 h-4 w-4" />
                {t('agents:marketing_strategy.page.guidedPlanning.startButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Configuration Start */}
      {approachMode === 'advanced' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('agents:marketing_strategy.page.advancedConfig.title')}</CardTitle>
            <CardDescription>
              {t('agents:marketing_strategy.page.advancedConfig.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('agents:marketing_strategy.page.advancedConfig.explanation')}
              </p>
              <Button onClick={handleAdvancedStrategy} className="w-full" size="lg">
                <Settings className="mr-2 h-4 w-4" />
                {t('agents:marketing_strategy.page.advancedConfig.openButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Footer */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>{t('agents:marketing_strategy.page.allOptionsNote')}</p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>{t('agents:marketing_strategy.page.features.smartBudget')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            <span>{t('agents:marketing_strategy.page.features.freeTactics')}</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart className="h-4 w-4" />
            <span>{t('agents:marketing_strategy.page.features.dataInsights')}</span>
          </div>
        </div>
      </div>
    </div>
  );
  }
}
