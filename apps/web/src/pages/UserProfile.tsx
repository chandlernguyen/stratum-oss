import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'
import { useAuthStore } from '@/stores/auth'
import { useOrganization } from '@/hooks/data/useOrganization'
import { useUpdateUserProfile } from '@/hooks/data/useUserProfile'
import { useUserRoles } from '@/hooks/useUserRoles'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal'
import { DeleteAccountModal } from '@/components/profile/DeleteAccountModal'
import { EnrollMFAModal } from '@/components/profile/EnrollMFAModal'
import { ManageMFAModal } from '@/components/profile/ManageMFAModal'
import {
  User,
  Shield,
  Building2,
  // Bell, // Temporarily unused - re-enable with NOTIFICATION PREFERENCES
  Key,
  Mail,
  Phone,
  Globe,
  Calendar,
  Users,
  Briefcase,
  Target,
  // Activity, // Temporarily unused - re-enable with VIEW LOGIN ACTIVITY
  Settings,
  Download,
  Loader2,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';
import { getIntlLocale } from '@/lib/locales';
import { usePageTitle } from '@/hooks/usePageTitle';
import { CONTACT_EMAIL } from '@/config/brand';

export function UserProfile() {
  const { t, locale } = useLocale('profile')
  // Set page title for GA4 tracking and accessibility
  usePageTitle(t('title'));

  const { user } = useAuthStore()
  const { organization, isAgency } = useOrganization()
  const [searchParams, setSearchParams] = useSearchParams()
  const { userRoles } = useUserRoles()

  // Get primary role based on organization type
  const getPrimaryRole = () => {
    if (!userRoles || userRoles.length === 0) return isAgency ? 'agency_owner' : 'sme_owner'

    // If agency organization, prioritize agency roles
    if (isAgency) {
      const agencyRole = userRoles.find(r => r.role_name.startsWith('agency_'))
      if (agencyRole) return agencyRole.role_name
    }

    // Otherwise, return first role or default
    return userRoles[0]?.role_name || (isAgency ? 'agency_owner' : 'sme_owner')
  }

  const role = getPrimaryRole()
  const [campaignCount, setCampaignCount] = useState(0)
  const [businessData, setBusinessData] = useState<any>(null)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [showManageMFAModal, setShowManageMFAModal] = useState(false)
  const [showEnrollMFAModal, setShowEnrollMFAModal] = useState(false)
  const [isDownloadingData, setIsDownloadingData] = useState(false)
  const [userMetadata, setUserMetadata] = useState<any>(null)

  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null)
  const updateProfile = useUpdateUserProfile()

  // Get initial tab from URL or default to 'profile'
  const mainTabFromUrl = searchParams.get('view') || 'profile'
  const [activeTab, setActiveTab] = useState(mainTabFromUrl)
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    company: '',
    bio: ''
  })

  useEffect(() => {
    // Initialize form with user data
    setFormData({
      displayName: user?.user_metadata?.full_name || '',
      phone: user?.user_metadata?.phone || '',
      company: organization?.name || '',
      bio: user?.user_metadata?.bio || ''
    })
  }, [user, organization])

  // Update active tab when URL changes
  useEffect(() => {
    const viewFromUrl = searchParams.get('view') || 'profile'
    if (viewFromUrl !== activeTab) {
      setActiveTab(viewFromUrl)
    }
  }, [searchParams])

  useEffect(() => {
    // Fetch user metadata including archive status
    const fetchUserMetadata = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('users')
          .select('archived_at, archive_reason, archived_by')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          setUserMetadata(data)
        }
      } catch (error) {
        console.error('Error fetching user metadata:', error)
      }
    }

    if (user) {
      fetchUserMetadata()
    }
  }, [user])

  useEffect(() => {
    // Fetch campaign count and business data
    const fetchData = async () => {
      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) return

      try {
        const headers = getLocaleHeaders();
        headers.Authorization = `Bearer ${session.data.session.access_token}`;

        // Fetch metrics
        const metricsResponse = await fetch(`${API_BASE_URL}/api/v1/dashboard/metrics`, {
          headers,
        })

        if (metricsResponse.ok) {
          const data = await metricsResponse.json()
          setCampaignCount(data.campaignCount || 0)
        }

        // Fetch business intelligence data
        if (organization?.id) {
          const bizResponse = await fetch(`${API_BASE_URL}/api/v1/business-intelligence/`, {
            headers,
          })

          if (bizResponse.ok) {
            const bizData = await bizResponse.json()
            setBusinessData(bizData.core_data)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user, organization?.id])

  const getRoleIcon = () => {
    switch (role) {
      case 'sme_owner': return <Building2 className="w-5 h-5" />
      case 'agency_owner': return <Shield className="w-5 h-5" />
      case 'agency_admin': return <Shield className="w-5 h-5" />
      case 'agency_account_manager': return <Users className="w-5 h-5" />
      case 'agency_strategist': return <Target className="w-5 h-5" />
      case 'agency_creative': return <Briefcase className="w-5 h-5" />
      case 'account_manager': return <Users className="w-5 h-5" />
      case 'client_stakeholder': return <User className="w-5 h-5" />
      case 'client_collaborator': return <User className="w-5 h-5" />
      default: return <User className="w-5 h-5" />
    }
  }

  const getRoleDisplay = () => {
    const roleKey = role || 'default'
    return t(`roles.${roleKey}`, { defaultValue: t('roles.default') })
  }

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'sme_owner': return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300'
      case 'agency_owner': return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300'
      case 'agency_admin': return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300'
      case 'agency_account_manager': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'agency_strategist': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
      case 'agency_creative': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      case 'account_manager': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'client_stakeholder': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
      case 'client_collaborator': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  // Inline editing save handlers
  const handleFieldSave = async (field: 'displayName' | 'phone' | 'bio', value: string) => {
    if (!value.trim() && field !== 'phone' && field !== 'bio') {
      // Don't save empty required fields
      toast.error(t('validation.fieldEmpty'));
      return;
    }

    const updateData: Record<string, string> = {};

    switch (field) {
      case 'displayName':
        updateData.full_name = value;
        break;
      case 'phone':
        updateData.phone = value;
        break;
      case 'bio':
        updateData.bio = value;
        break;
    }

    await updateProfile.mutateAsync(updateData);
    setEditingField(null);
  };

  const handleFieldBlur = (field: 'displayName' | 'phone' | 'bio') => {
    if (editingField === field) {
      handleFieldSave(field, formData[field]);
    }
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent, field: 'displayName' | 'phone' | 'bio') => {
    if (e.key === 'Enter' && editingField === field) {
      handleFieldSave(field, formData[field]);
    }
    if (e.key === 'Escape') {
      // Revert changes on Escape
      setFormData({
        displayName: user?.user_metadata?.full_name || '',
        phone: user?.user_metadata?.phone || '',
        company: organization?.name || '',
        bio: user?.user_metadata?.bio || ''
      });
      setEditingField(null);
    }
  };

  const getInitials = () => {
    const email = user?.email || ''
    const name = formData.displayName || email
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getDeletionDate = () => {
    if (!userMetadata?.archived_at) return null
    const archivedDate = new Date(userMetadata.archived_at)
    const deletionDate = new Date(archivedDate)
    deletionDate.setDate(deletionDate.getDate() + 30)
    return deletionDate
  }

  const formatDeletionDate = () => {
    const deletionDate = getDeletionDate()
    if (!deletionDate) return ''
    return deletionDate.toLocaleDateString(getIntlLocale(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDownloadData = async () => {
    setIsDownloadingData(true)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) {
        toast.error(t('toast.notAuthenticated'), {
          description: t('toast.notAuthenticatedDesc')
        })
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/users/export-data`, {
        headers: getLocaleHeaders({
          'Authorization': `Bearer ${session.data.session.access_token}`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Get the JSON data
      const data = await response.json()

      // Create a blob and download it
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user_data_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(t('toast.exportSuccess'), {
        description: t('toast.exportSuccessDesc')
      })
    } catch (error) {
      console.error('Error downloading data:', error)
      toast.error(t('toast.exportError'), {
        description: t('toast.exportErrorDesc')
      })
    } finally {
      setIsDownloadingData(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Account Deletion Warning */}
      {userMetadata?.archived_at && (
        <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900 dark:text-red-100 font-semibold text-lg">
            {t('deletion.title')}
          </AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-200 space-y-3">
            <div className="flex items-start gap-2 mt-2">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  {t('deletion.deletionDate', { date: formatDeletionDate() })}
                </p>
                <p className="text-sm mt-1">
                  {userMetadata.archive_reason && (
                    <>{t('deletion.reason', { reason: userMetadata.archive_reason })}</>
                  )}
                </p>
              </div>
            </div>
            <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-md border border-red-300 dark:border-red-700">
              <p className="text-sm font-medium mb-1">{t('deletion.restoreTitle')}</p>
              <p className="text-sm">
                {t('deletion.restoreDescription', { email: CONTACT_EMAIL })}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:justify-between gap-4">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-slate-600 to-amber-600 flex items-center justify-center text-white font-medium text-xl md:text-2xl">
                {getInitials()}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  {formData.displayName || user?.email}
                </h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={getRoleBadgeColor()}>
                    <span className="flex items-center gap-1">
                      {getRoleIcon()}
                      {getRoleDisplay()}
                    </span>
                  </Badge>
                  <Badge variant="outline">
                    {organization?.type === 'AGENCY' ? t('orgType.agency') : t('orgType.sme')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value)
        const newParams = new URLSearchParams(searchParams)
        newParams.set('view', value)
        newParams.delete('tab')
        setSearchParams(newParams)
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-1 md:gap-0">
          <TabsTrigger value="profile" className="text-sm md:text-base" aria-label={t('tabs.profile')}>
            <User className="w-4 h-4 mr-1 md:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{t('tabs.profile')}</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="text-sm md:text-base" aria-label={t('tabs.permissions')}>
            <Shield className="w-4 h-4 mr-1 md:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{t('tabs.permissions')}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-sm md:text-base" aria-label={t('tabs.settings')}>
            <Settings className="w-4 h-4 mr-1 md:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{t('tabs.settings')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Combined Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('profileInfo.title')}</CardTitle>
              <CardDescription>
                {t('profileInfo.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-base font-semibold mb-4">{t('personal.title')}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">
                      <User className="w-4 h-4 inline mr-1" />
                      {t('personal.displayName')}
                    </Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      onFocus={() => setEditingField('displayName')}
                      onBlur={() => handleFieldBlur('displayName')}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'displayName')}
                      placeholder={t('personal.displayNamePlaceholder')}
                      className={editingField === 'displayName' ? 'ring-2 ring-amber-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="w-4 h-4 inline mr-1" />
                      {t('personal.email')}
                    </Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <Phone className="w-4 h-4 inline mr-1" />
                      {t('personal.phone')}
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      onFocus={() => setEditingField('phone')}
                      onBlur={() => handleFieldBlur('phone')}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'phone')}
                      placeholder={t('personal.phonePlaceholder')}
                      className={editingField === 'phone' ? 'ring-2 ring-amber-500' : ''}
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="bio">{t('personal.bio')}</Label>
                  <textarea
                    id="bio"
                    className={`w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${editingField === 'bio' ? 'ring-2 ring-amber-500' : ''}`}
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    onFocus={() => setEditingField('bio')}
                    onBlur={() => handleFieldBlur('bio')}
                    onKeyDown={(e) => handleFieldKeyDown(e, 'bio')}
                    placeholder={t('personal.bioPlaceholder')}
                  />
                </div>
              </div>

              {/* Organization Details Section */}
              <div className="pt-6 border-t">
                <h3 className="text-base font-semibold mb-4">{t('organization.title')}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      {t('organization.name')}
                      <span className="text-xs text-muted-foreground ml-2">{t('organization.nameNote')}</span>
                    </Label>
                    <Input id="orgName" value={organization?.name || ''} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgType">
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      {t('organization.type')}
                    </Label>
                    <Input
                      id="orgType"
                      value={organization?.type === 'AGENCY' ? t('organization.typeAgency') : t('organization.typeSME')}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberSince">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {t('organization.memberSince')}
                    </Label>
                    <Input
                      id="memberSince"
                      value={new Date(user?.created_at || '').toLocaleDateString(getIntlLocale(locale))}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="activeCampaigns">
                      <Target className="w-4 h-4 inline mr-1" />
                      {t('organization.activeCampaigns')}
                    </Label>
                    <Input id="activeCampaigns" value={t('organization.campaignCount', { count: campaignCount })} disabled className="bg-muted" />
                  </div>
                  {businessData?.website && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="orgWebsite">
                        <Globe className="w-4 h-4 inline mr-1" />
                        {t('organization.website')}
                      </Label>
                      <Input id="orgWebsite" value={businessData.website} disabled className="bg-muted" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('permissions.title')}</CardTitle>
              <CardDescription>
                {t('permissions.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Role-specific permissions */}
                {role === 'agency_admin' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-brand-success" />
                        <span className="text-sm font-medium">{t('permissions.fullAdmin.title')}</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">{t('permissions.fullAdmin.enabled')}</Badge>
                    </div>
                    <div className="grid gap-2 pl-6">
                      {(t('permissions.fullAdmin.permissions', { returnObjects: true }) as string[]).map((permission) => (
                        <div key={permission} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-success" />
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {role === 'sme_owner' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/20">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span className="text-sm font-medium">{t('permissions.businessOwner.title')}</span>
                      </div>
                      <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300">{t('permissions.businessOwner.enabled')}</Badge>
                    </div>
                    <div className="grid gap-2 pl-6">
                      {(t('permissions.businessOwner.permissions', { returnObjects: true }) as string[]).map((permission) => (
                        <div key={permission} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600 dark:bg-slate-400" />
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {role === 'account_manager' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-warning" />
                        <span className="text-sm font-medium">{t('permissions.accountManager.title')}</span>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">{t('permissions.accountManager.enabled')}</Badge>
                    </div>
                    <div className="grid gap-2 pl-6">
                      {(t('permissions.accountManager.permissions', { returnObjects: true }) as string[]).map((permission) => (
                        <div key={permission} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-warning" />
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(role === 'client_stakeholder' || role === 'client_collaborator') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-brand-slate" />
                        <span className="text-sm font-medium">{t('permissions.guest.title')}</span>
                      </div>
                      <Badge className="bg-gray-100 text-gray-800">{t('permissions.guest.limited')}</Badge>
                    </div>
                    <div className="grid gap-2 pl-6">
                      {(t('permissions.guest.permissions', { returnObjects: true }) as string[]).map((permission) => (
                        <div key={permission} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-slate" />
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security Measures */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3">{t('permissions.security.title')}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t('permissions.security.description')}
                  </p>
                  <div className="grid gap-2">
                    {(t('permissions.security.measures', { returnObjects: true }) as string[]).map((measure) => (
                      <div key={measure} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 dark:bg-slate-400" />
                        {measure}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.title')}</CardTitle>
              <CardDescription>
                {t('settings.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/*
               * NOTIFICATION PREFERENCES - Temporarily Hidden (Dec 2025)
               *
               * Why hidden: Feature is marked "Coming Soon" but not yet implemented.
               *             Hiding to reduce UI clutter until backend support is ready.
               *
               * To re-enable: Remove the opening comment below and closing comment
               *               after the </div> (search for "END NOTIFICATION PREFERENCES")
               *
               * Backend requirements before enabling:
               *   - User notification preferences table
               *   - API endpoints for CRUD operations
               *   - Email service integration (Resend)
               */}
              {/* START NOTIFICATION PREFERENCES - Uncomment to show
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notification Preferences
                  </h3>
                  <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Email notification settings will be available in a future update.
                </p>
                <div className="space-y-3 opacity-50 pointer-events-none">
                  {[
                    { label: 'Email notifications for campaign updates', defaultChecked: true },
                    { label: 'Weekly performance reports', defaultChecked: true },
                    { label: 'AI agent recommendations', defaultChecked: false },
                    { label: 'System maintenance alerts', defaultChecked: true }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <Label htmlFor={item.label} className="text-sm font-normal cursor-not-allowed">
                        {item.label}
                      </Label>
                      <input
                        type="checkbox"
                        id={item.label}
                        defaultChecked={item.defaultChecked}
                        disabled
                        className="rounded border-gray-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
              END NOTIFICATION PREFERENCES */}

              {/* Security Settings */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  {t('settings.security.title')}
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full min-h-12 md:min-h-10 justify-start"
                    onClick={() => setShowChangePasswordModal(true)}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {t('settings.security.changePassword')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full min-h-12 md:min-h-10 justify-start"
                    onClick={() => setShowManageMFAModal(true)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {t('settings.security.manageMFA')}
                  </Button>
                  {/*
                   * VIEW LOGIN ACTIVITY - Temporarily Hidden (Dec 2025)
                   *
                   * Why hidden: Feature is "Coming Soon" and not yet implemented.
                   *             Hiding to reduce UI clutter until backend support is ready.
                   *
                   * To re-enable: Remove the comment markers around the Button below
                   *               (search for "END VIEW LOGIN ACTIVITY")
                   *
                   * Backend requirements before enabling:
                   *   - Login audit log table (user_login_history)
                   *   - API endpoint to fetch login history
                   *   - Geolocation/device detection
                   */}
                  {/* START VIEW LOGIN ACTIVITY - Uncomment to show
                  <Button variant="outline" className="w-full min-h-12 md:min-h-10 justify-between" disabled>
                    <span className="flex items-center">
                      <Activity className="w-4 h-4 mr-2" />
                      View Login Activity
                    </span>
                    <Badge variant="outline" className="text-muted-foreground ml-2">Coming Soon</Badge>
                  </Button>
                  END VIEW LOGIN ACTIVITY */}
                </div>
              </div>

              {/* Data & Privacy */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  {t('settings.dataPrivacy.title')}
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full min-h-12 md:min-h-10 justify-start"
                    onClick={handleDownloadData}
                    disabled={isDownloadingData}
                  >
                    {isDownloadingData ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isDownloadingData ? t('settings.dataPrivacy.downloading') : t('settings.dataPrivacy.downloadData')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full min-h-12 md:min-h-10 justify-start text-red-600 hover:text-red-700"
                    onClick={() => setShowDeleteAccountModal(true)}
                  >
                    {t('settings.dataPrivacy.deleteAccount')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={showChangePasswordModal}
        onOpenChange={setShowChangePasswordModal}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        open={showDeleteAccountModal}
        onOpenChange={setShowDeleteAccountModal}
      />

      {/* MFA Modals */}
      <ManageMFAModal
        open={showManageMFAModal}
        onOpenChange={setShowManageMFAModal}
        onEnrollClick={() => {
          setShowManageMFAModal(false)
          setShowEnrollMFAModal(true)
        }}
      />

      <EnrollMFAModal
        open={showEnrollMFAModal}
        onOpenChange={setShowEnrollMFAModal}
        onSuccess={() => {
          // Refresh MFA status after successful enrollment
          setShowEnrollMFAModal(false)
          setShowManageMFAModal(true)
        }}
      />
    </div>
  )
}
