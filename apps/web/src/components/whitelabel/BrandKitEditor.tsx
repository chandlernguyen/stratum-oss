import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useWhiteLabel } from './WhiteLabelProvider'
import type { BrandKit } from '@/styles/themeEngine'
import {
  Palette,
  Type,
  Upload,
  Eye,
  RotateCcw,
  Save,
  Download,
  Sparkles,
  Image
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandKitEditorProps {
  onSave?: (brandKit: BrandKit) => void
  className?: string
}

export function BrandKitEditor({ onSave, className }: BrandKitEditorProps) {
  const { t } = useTranslation('brand')
  const { brandKit: currentBrandKit, applyBrandKit, resetTheme, previewMode, setPreviewMode } = useWhiteLabel()
  
  const [brandKit, setBrandKit] = useState<BrandKit>(currentBrandKit || {
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    accentColor: '#10B981',
    companyName: 'Your Company',
    logo: '/logo.png',
    favicon: '/favicon.ico',
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    borderRadius: 'md',
    density: 'comfortable'
  })
  
  const [customCSS, setCustomCSS] = useState(brandKit.customCSS || '')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const handleColorChange = (field: keyof BrandKit, value: string) => {
    setBrandKit(prev => ({ ...prev, [field]: value }))
  }

  const handleFontChange = (type: 'heading' | 'body', value: string) => {
    setBrandKit(prev => ({
      ...prev,
      fonts: { ...prev.fonts, [type]: value }
    }))
  }

  const handleFileUpload = async (type: 'logo' | 'favicon', file: File) => {
    // In production, upload to storage service
    // For demo, create local URL
    const url = URL.createObjectURL(file)
    setBrandKit(prev => ({ ...prev, [type]: url }))
  }

  const handlePreview = () => {
    setPreviewMode(true)
    applyBrandKit({ ...brandKit, customCSS })
  }

  const handleSave = () => {
    setPreviewMode(false)
    const finalBrandKit = { ...brandKit, customCSS }
    applyBrandKit(finalBrandKit)
    onSave?.(finalBrandKit)
  }

  const handleExport = () => {
    const data = JSON.stringify({ ...brandKit, customCSS }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brand-kit-${Date.now()}.json`
    a.click()
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string)
          setBrandKit(imported)
          if (imported.customCSS) {
            setCustomCSS(imported.customCSS)
          }
        } catch (error) {
          console.error('Failed to import brand kit:', error)
        }
      }
      reader.readAsText(file)
    }
  }

  const fontOptions = [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Raleway',
    'Playfair Display',
    'Merriweather',
    'Source Sans Pro'
  ]

  return (
    <Card className={cn("max-w-4xl", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              {t('editor.title')}
            </CardTitle>
            <CardDescription>
              {t('editor.description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {previewMode && (
              <Badge className="bg-yellow-100 text-yellow-800">
                {t('editor.previewMode')}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('editor.export')}
            </Button>
            <label className="cursor-pointer">
              <div className="inline-flex items-center justify-center gap-2 px-3 h-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors">
                <Upload className="w-4 h-4" />
                {t('editor.import')}
              </div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Identity */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Image className="w-4 h-4" />
            {t('editor.sections.companyIdentity')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company-name">{t('editor.fields.companyName')}</Label>
              <Input
                id="company-name"
                value={brandKit.companyName}
                onChange={(e) => setBrandKit(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder={t('editor.placeholders.companyName')}
              />
            </div>
            <div>
              <Label htmlFor="logo">{t('editor.fields.logoUrl')}</Label>
              <div className="flex gap-2">
                <Input
                  id="logo"
                  value={brandKit.logo}
                  onChange={(e) => setBrandKit(prev => ({ ...prev, logo: e.target.value }))}
                  placeholder={t('editor.placeholders.logoUrl')}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload('logo', file)
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4" />
            {t('editor.sections.colorPalette')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="primary-color">{t('editor.fields.primaryColor')}</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="text"
                  value={brandKit.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  placeholder="#3B82F6"
                />
                <Input
                  type="color"
                  value={brandKit.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary-color">{t('editor.fields.secondaryColor')}</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="text"
                  value={brandKit.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  placeholder="#8B5CF6"
                />
                <Input
                  type="color"
                  value={brandKit.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="accent-color">{t('editor.fields.accentColor')}</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="text"
                  value={brandKit.accentColor}
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  placeholder="#10B981"
                />
                <Input
                  type="color"
                  value={brandKit.accentColor}
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          {/* Color Preview */}
          <div className="flex gap-2">
            <div className="flex-1 h-20 rounded-lg" style={{ backgroundColor: brandKit.primaryColor }} />
            <div className="flex-1 h-20 rounded-lg" style={{ backgroundColor: brandKit.secondaryColor }} />
            <div className="flex-1 h-20 rounded-lg" style={{ backgroundColor: brandKit.accentColor }} />
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Type className="w-4 h-4" />
            {t('editor.sections.typography')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="heading-font">{t('editor.fields.headingFont')}</Label>
              <Select
                value={brandKit.fonts.heading}
                onValueChange={(value) => handleFontChange('heading', value)}
              >
                <SelectTrigger id="heading-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map(font => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="body-font">{t('editor.fields.bodyFont')}</Label>
              <Select
                value={brandKit.fonts.body}
                onValueChange={(value) => handleFontChange('body', value)}
              >
                <SelectTrigger id="body-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map(font => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* UI Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('editor.sections.uiPreferences')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="border-radius">{t('editor.fields.borderRadius')}</Label>
              <Select
                value={brandKit.borderRadius || 'md'}
                onValueChange={(value: any) => setBrandKit(prev => ({ ...prev, borderRadius: value }))}
              >
                <SelectTrigger id="border-radius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('editor.options.borderRadius.none')}</SelectItem>
                  <SelectItem value="sm">{t('editor.options.borderRadius.small')}</SelectItem>
                  <SelectItem value="md">{t('editor.options.borderRadius.medium')}</SelectItem>
                  <SelectItem value="lg">{t('editor.options.borderRadius.large')}</SelectItem>
                  <SelectItem value="xl">{t('editor.options.borderRadius.extraLarge')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="density">{t('editor.fields.contentDensity')}</Label>
              <Select
                value={brandKit.density || 'comfortable'}
                onValueChange={(value: any) => setBrandKit(prev => ({ ...prev, density: value }))}
              >
                <SelectTrigger id="density">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">{t('editor.options.density.comfortable')}</SelectItem>
                  <SelectItem value="compact">{t('editor.options.density.compact')}</SelectItem>
                  <SelectItem value="spacious">{t('editor.options.density.spacious')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Custom CSS */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('editor.sections.customCss')}</h3>
          <Textarea
            value={customCSS}
            onChange={(e) => setCustomCSS(e.target.value)}
            placeholder={t('editor.placeholders.customCss')}
            className="font-mono text-sm h-32"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={resetTheme}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('editor.buttons.resetToDefault')}
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
          >
            <Eye className="w-4 h-4 mr-2" />
            {t('editor.buttons.preview')}
          </Button>
          <Button
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-2" />
            {t('editor.buttons.saveAndApply')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}