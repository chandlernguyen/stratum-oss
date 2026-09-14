import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X, Plus, Megaphone, Target, Eye, Palette, AlertTriangle, Archive, AlertCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useBrandGuidelines, type BrandGuideline } from '@/components/brand-guidelines/hooks/useBrandGuidelines';
import { useBrandGuidelinesActions } from '@/components/brand-guidelines/hooks/useBrandGuidelinesActions';
import { BrandGuidelinesGrid } from '@/components/brand-guidelines/BrandGuidelinesGrid';
import { BrandGuidelineViewModal } from '@/components/brand-guidelines/BrandGuidelineViewModal';
import { BrandVoiceSection } from '@/components/brand-guidelines/forms/BrandVoiceSection';
import { MessagingSection } from '@/components/brand-guidelines/forms/MessagingSection';
import { BrandStrategySection } from '@/components/brand-guidelines/forms/BrandStrategySection';
import { VisualIdentitySection } from '@/components/brand-guidelines/forms/VisualIdentitySection';

interface StructuredBrandGuidelinesTabProps {
  orgId?: string;
  campaignId?: string;
  clientId?: string; // For agency schema routing
  currentCampaign?: any;
}

export function StructuredBrandGuidelinesTab({ orgId, campaignId, clientId }: StructuredBrandGuidelinesTabProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedGuideline, setEditedGuideline] = useState<BrandGuideline | null>(null);
  const [viewingGuideline, setViewingGuideline] = useState<BrandGuideline | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeTab, setActiveTab] = useState("brand_voice");

  // Data fetching
  const {
    currentGuideline,
    setCurrentGuideline,
    loading,
    groupedGuidelines,
    groupingStats,
    multipleActiveAlert,
    refetch
  } = useBrandGuidelines({ orgId, campaignId, clientId, showArchived });

  // Actions
  const actions = useBrandGuidelinesActions({
    onSuccess: () => {
      refetch();
      setIsEditing(false);
      setEditedGuideline(null);
    }
  });

  // Field manipulation
  const updateField = (path: string, value: any) => {
    if (!editedGuideline) return;
    const pathParts = path.split('.');
    const newGuideline = { ...editedGuideline };
    let current: any = newGuideline;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) current[part] = {};
      current = current[part];
    }

    current[pathParts[pathParts.length - 1]] = value;
    setEditedGuideline(newGuideline);
  };

  const updateArrayField = (path: string, index: number, value: string) => {
    if (!editedGuideline) return;
    const pathParts = path.split('.');
    const newGuideline = { ...editedGuideline };
    let current: any = newGuideline;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) current[part] = {};
      current = current[part];
    }

    const field = pathParts[pathParts.length - 1];
    if (!current[field]) current[field] = [];
    const newArray = [...current[field]];
    newArray[index] = value;
    current[field] = newArray.filter(item => item.trim() !== '');
    setEditedGuideline(newGuideline);
  };

  const addArrayItem = (path: string) => {
    if (!editedGuideline) return;
    const pathParts = path.split('.');
    const newGuideline = { ...editedGuideline };
    let current: any = newGuideline;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) current[part] = {};
      current = current[part];
    }

    const field = pathParts[pathParts.length - 1];
    if (!current[field]) current[field] = [];
    current[field] = [...current[field], ''];
    setEditedGuideline(newGuideline);
  };

  const removeArrayItem = (path: string, index: number) => {
    if (!editedGuideline) return;
    const pathParts = path.split('.');
    const newGuideline = { ...editedGuideline };
    let current: any = newGuideline;

    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }

    const field = pathParts[pathParts.length - 1];
    current[field] = current[field].filter((_: any, i: number) => i !== index);
    setEditedGuideline(newGuideline);
  };

  const getFieldValue = (path: string) => {
    if (!editedGuideline) return '';
    const pathParts = path.split('.');
    let current: any = editedGuideline;

    for (const part of pathParts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return '';
      }
    }

    return current || '';
  };

  const handleCreate = () => {
    // Always start with blank template for CREATE
    const blankGuideline = {
      // No id field - signals INSERT operation
      org_id: orgId || '',
      name: 'Brand Guidelines',
      description: '',
      guidelines: {
        brand_voice: { tone_of_voice: {}, personality_traits: {}, writing_style: {} },
        messaging: { key_messages: {}, value_propositions: {}, content_rules: {} },
        brand_strategy: {},
        visual_identity: {}
      },
      is_active: true,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Partial<BrandGuideline> as BrandGuideline;

    setEditedGuideline(blankGuideline);
    setIsEditing(true);
  };

  const handleEdit = () => {
    // Use currentGuideline for EDIT operations
    const guidelineToEdit = currentGuideline || {
      id: '',
      org_id: orgId || '',
      name: 'Brand Guidelines',
      description: '',
      guidelines: {
        brand_voice: { tone_of_voice: {}, personality_traits: {}, writing_style: {} },
        messaging: { key_messages: {}, value_propositions: {}, content_rules: {} },
        brand_strategy: {},
        visual_identity: {}
      },
      is_active: true,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as BrandGuideline;

    setEditedGuideline(guidelineToEdit);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedGuideline(null);
  };

  const handleSave = async () => {
    if (!editedGuideline) return;
    const success = await actions.handleSave(editedGuideline);
    if (success) {
      refetch();
      setIsEditing(false);
      setEditedGuideline(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <div className="p-6 text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Organization Not Available
          </h3>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            Brand Guidelines require organization context. Please ensure you're logged in properly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Brand Guidelines</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Structured guidelines for consistent AI-powered content creation
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowArchived(false)}
              variant={!showArchived ? "default" : "outline"}
              size="sm"
              className="gap-1 flex-1 sm:flex-none min-h-12 md:min-h-10"
            >
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">View Active</span>
              <span className="sm:hidden">Active</span>
            </Button>
            <Button
              onClick={() => setShowArchived(true)}
              variant={showArchived ? "default" : "outline"}
              size="sm"
              className="gap-1 flex-1 sm:flex-none min-h-12 md:min-h-10"
            >
              <Archive className="h-3 w-3" />
              <span className="hidden sm:inline">View Archived</span>
              <span className="sm:hidden">Archived</span>
            </Button>
          </div>

          {!isEditing && !showArchived && (
            <Button onClick={handleCreate} variant="outline" size="sm" className="min-h-12 md:min-h-10 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Guidelines
            </Button>
          )}
        </div>
      </div>

      {/* Guidelines Grid */}
      {!isEditing && (
        <BrandGuidelinesGrid
          groupedGuidelines={groupedGuidelines}
          groupingStats={groupingStats}
          multipleActiveAlert={multipleActiveAlert}
          showArchived={showArchived}
          onView={(guideline) => {
            setViewingGuideline(guideline);
            setShowViewModal(true);
          }}
          onEdit={(guideline) => {
            setCurrentGuideline(guideline);
            handleEdit();
          }}
          onArchive={actions.openArchiveDialog}
          onRestore={actions.handleRestore}
          onDelete={actions.openDeleteConfirm}
          onCopy={(guideline) => {
            const copyGuideline = {
              ...guideline,
              id: '',
              name: `${guideline.name} (Copy)`,
              is_default: false
            };
            setEditedGuideline(copyGuideline);
            setIsEditing(true);
          }}
          onToggleArchived={setShowArchived}
          onCreateNew={handleCreate}
        />
      )}

      {/* Editing Form */}
      {isEditing && editedGuideline && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="text-lg md:text-xl">
                {editedGuideline.id ? 'Edit Brand Guidelines' : 'Create Brand Guidelines'}
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1 md:flex-none min-h-12 md:min-h-10">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={actions.saving} size="sm" className="flex-1 md:flex-none min-h-12 md:min-h-10">
                  <Save className="h-4 w-4 mr-2" />
                  {actions.saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!editedGuideline.id && (
              <Alert className="border-slate-200 bg-slate-50 dark:bg-slate-900/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  <strong>Getting Started:</strong> Fill out at least one section.
                  Start with "Brand Voice" for Content Agent optimization.
                </AlertDescription>
              </Alert>
            )}

            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-1">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editedGuideline.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Q1 2024 Brand Guidelines"
                  className="min-h-12 md:min-h-10"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editedGuideline.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Brief description of these guidelines..."
                  rows={2}
                  className="min-h-24"
                />
              </div>
            </div>

            {/* Structured Guidelines Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 md:gap-0">
                <TabsTrigger value="brand_voice" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Megaphone className="h-3 w-3 md:h-4 md:w-4" />
                  Voice
                </TabsTrigger>
                <TabsTrigger value="messaging" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Target className="h-3 w-3 md:h-4 md:w-4" />
                  Messaging
                </TabsTrigger>
                <TabsTrigger value="brand_strategy" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Eye className="h-3 w-3 md:h-4 md:w-4" />
                  Strategy
                </TabsTrigger>
                <TabsTrigger value="visual_identity" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Palette className="h-3 w-3 md:h-4 md:w-4" />
                  Visual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="brand_voice">
                <BrandVoiceSection
                  getFieldValue={getFieldValue}
                  updateField={updateField}
                  updateArrayField={updateArrayField}
                  addArrayItem={addArrayItem}
                  removeArrayItem={removeArrayItem}
                />
              </TabsContent>

              <TabsContent value="messaging">
                <MessagingSection
                  getFieldValue={getFieldValue}
                  updateField={updateField}
                  updateArrayField={updateArrayField}
                  addArrayItem={addArrayItem}
                  removeArrayItem={removeArrayItem}
                />
              </TabsContent>

              <TabsContent value="brand_strategy">
                <BrandStrategySection
                  getFieldValue={getFieldValue}
                  updateField={updateField}
                  updateArrayField={updateArrayField}
                  addArrayItem={addArrayItem}
                  removeArrayItem={removeArrayItem}
                />
              </TabsContent>

              <TabsContent value="visual_identity">
                <VisualIdentitySection
                  getFieldValue={getFieldValue}
                  updateField={updateField}
                  updateArrayField={updateArrayField}
                  addArrayItem={addArrayItem}
                  removeArrayItem={removeArrayItem}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ✅ Unified Confirmation Dialogs */}
      <ConfirmDialog {...actions.deleteDialogProps} />
      <ConfirmDialog {...actions.archiveDialogProps} />

      {/* View Modal */}
      <BrandGuidelineViewModal
        guideline={viewingGuideline}
        open={showViewModal}
        onOpenChange={setShowViewModal}
      />
    </div>
  );
}
