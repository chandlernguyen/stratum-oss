import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClientContext } from '@/contexts/ClientContext'
import { useAgentOutputs, type AgentOutput } from '@/hooks/data/useAgentOutputs'
import { useApprovalForResource, useResolveApproval } from '@/hooks/data/useCollaboration'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayeredSpinner } from '@/components/ui/layered-icon'
import { Clock, CheckCircle, MessageSquare, AlertCircle, Eye, Loader2, Sparkles, FileCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

/**
 * ClientReviewPage - Main page for external clients to review agency work
 *
 * Features:
 * - List of outputs pending review
 * - Quick approve/request changes actions
 * - Comment thread access
 * - Filter by status (pending, approved, changes requested)
 */
export function ClientReviewPage() {
  const { t } = useTranslation('review')
  const clientContext = useClientContext()
  const clientId = clientContext?.clientId
  const clientName = clientContext?.clientData?.client_info?.name || t('hero.defaultClientName')

  const [activeTab, setActiveTab] = useState('pending')

  // Fetch outputs for this client
  const { data: outputs, isLoading, error } = useAgentOutputs({
    clientId: clientId || undefined,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <LayeredSpinner size="lg" />
        <p className="text-sm text-muted-foreground">{t('loading.message')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card className="border-brand-error/30 bg-brand-error/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-error">
              <AlertCircle className="h-5 w-5" />
              {t('error.title')}
            </CardTitle>
            <CardDescription>
              {error.message || t('error.defaultMessage')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const pendingCount = outputs?.filter((o: AgentOutput) => o.approval_status === 'pending').length || 0
  const approvedCount = outputs?.filter((o: AgentOutput) => o.approval_status === 'approved').length || 0
  const changesCount = outputs?.filter((o: AgentOutput) => o.approval_status === 'changes_needed').length || 0

  // Filter outputs based on active tab
  const filteredOutputs = outputs?.filter((o: AgentOutput) => {
    if (activeTab === 'pending') return o.approval_status === 'pending' || o.approval_status === 'not_submitted'
    if (activeTab === 'approved') return o.approval_status === 'approved'
    if (activeTab === 'changes') return o.approval_status === 'changes_needed'
    return true
  }) || []

  return (
    <div className="min-h-screen">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-50"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative container py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                <FileCheck className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-white/90">{t('hero.badge')}</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {clientName}
              </h1>
              <p className="text-slate-300 text-lg max-w-lg">
                {t('hero.subtitle')}
              </p>
            </div>

            {/* Premium Stats Cards in Hero */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('pending')}
                className={`group relative overflow-hidden rounded-xl px-5 py-4 transition-all duration-300 ${
                  activeTab === 'pending'
                    ? 'bg-amber-500/20 ring-2 ring-amber-400/50'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-white">{pendingCount}</p>
                    <p className="text-xs text-slate-400">{t('stats.pending')}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('approved')}
                className={`group relative overflow-hidden rounded-xl px-5 py-4 transition-all duration-300 ${
                  activeTab === 'approved'
                    ? 'bg-emerald-500/20 ring-2 ring-emerald-400/50'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-white">{approvedCount}</p>
                    <p className="text-xs text-slate-400">{t('stats.approved')}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('changes')}
                className={`group relative overflow-hidden rounded-xl px-5 py-4 transition-all duration-300 ${
                  activeTab === 'changes'
                    ? 'bg-orange-500/20 ring-2 ring-orange-400/50'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <MessageSquare className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-white">{changesCount}</p>
                    <p className="text-xs text-slate-400">{t('stats.changes')}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container py-8 space-y-6">
        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="inline-flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
            <TabsTrigger
              value="pending"
              className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tabs.pending')}</span>
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tabs.approved')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="changes"
              className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tabs.changes')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredOutputs.length > 0 ? (
              <div className="grid gap-4">
                {filteredOutputs.map((output: AgentOutput) => (
                  <OutputCard key={output.id} output={output} />
                ))}
              </div>
            ) : (
              <EmptyState tab={activeTab} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Output Card Component
function OutputCard({ output }: { output: AgentOutput }) {
  const { t } = useTranslation('review')
  const clientContext = useClientContext()
  const clientSlug = clientContext?.clientSlug || 'my-client'
  const portalBase = `/portal/${clientSlug}`
  const queryClient = useQueryClient()

  // Get the approval request for this output
  const { data: approvalData } = useApprovalForResource('output', output.id)
  const resolveApproval = useResolveApproval()

  const handleApprove = async () => {
    if (!approvalData?.approval?.id) return
    await resolveApproval.mutateAsync({
      id: approvalData.approval.id,
      status: 'approved',
      resolution_note: t('outputCard.approvedByClient')
    })
    queryClient.invalidateQueries({ queryKey: ['agent-outputs'] })
  }

  const handleRequestChanges = async () => {
    if (!approvalData?.approval?.id) return
    await resolveApproval.mutateAsync({
      id: approvalData.approval.id,
      status: 'changes_requested',
      resolution_note: t('outputCard.changesRequestedByClient')
    })
    queryClient.invalidateQueries({ queryKey: ['agent-outputs'] })
  }

  const isResolving = resolveApproval.isPending

  const statusConfig = {
    not_submitted: {
      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      labelKey: 'status.draft' as const,
      icon: FileCheck
    },
    pending: {
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      labelKey: 'status.awaitingReview' as const,
      icon: Clock
    },
    approved: {
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      labelKey: 'status.approved' as const,
      icon: CheckCircle
    },
    changes_needed: {
      color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      labelKey: 'status.changesRequested' as const,
      icon: MessageSquare
    },
    rejected: {
      color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      labelKey: 'status.rejected' as const,
      icon: AlertCircle
    }
  }

  const status = statusConfig[output.approval_status as keyof typeof statusConfig] || statusConfig.not_submitted
  const StatusIcon = status.icon

  return (
    <Card className="group relative overflow-hidden border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(245,158,11,0.08)]">
      {/* Grain texture overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wMTUiLz48L3N2Zz4=')] pointer-events-none"></div>

      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              {output.title || t('outputCard.untitledOutput')}
            </CardTitle>
            <CardDescription className="mt-2 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Sparkles className="h-3 w-3" />
                {output.agent_type || t('outputCard.defaultAgentType')}
              </span>
              {output.created_at && (
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  {formatDistanceToNow(new Date(output.created_at), { addSuffix: true })}
                </span>
              )}
            </CardDescription>
          </div>
          <Badge className={`${status.color} flex items-center gap-1.5 font-medium`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {t(status.labelKey)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {output.summary && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 line-clamp-2 leading-relaxed">
            {output.summary}
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-slate-300 dark:border-slate-600 hover:border-amber-400 hover:text-amber-700 dark:hover:border-amber-500 dark:hover:text-amber-400 transition-colors"
          >
            <Link to={`${portalBase}/outputs/${output.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              {t('outputCard.viewDetails')}
            </Link>
          </Button>
          {output.approval_status === 'pending' && approvalData?.approval && (
            <>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isResolving}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-sm hover:shadow-md transition-all"
              >
                {isResolving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {t('outputCard.approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRequestChanges}
                disabled={isResolving}
                className="border-slate-300 text-slate-700 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50 dark:border-slate-600 dark:text-slate-300 dark:hover:border-orange-500 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 transition-colors"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('outputCard.requestChanges')}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Empty State Component
function EmptyState({ tab }: { tab: string }) {
  const { t } = useTranslation('review')

  const config = {
    pending: {
      icon: Clock,
      iconBg: 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      titleKey: 'emptyState.pending.title' as const,
      descriptionKey: 'emptyState.pending.description' as const,
      hintKey: 'emptyState.pending.hint' as const
    },
    approved: {
      icon: CheckCircle,
      iconBg: 'bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      titleKey: 'emptyState.approved.title' as const,
      descriptionKey: 'emptyState.approved.description' as const,
      hintKey: 'emptyState.approved.hint' as const
    },
    changes: {
      icon: MessageSquare,
      iconBg: 'bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      titleKey: 'emptyState.changes.title' as const,
      descriptionKey: 'emptyState.changes.description' as const,
      hintKey: 'emptyState.changes.hint' as const
    }
  }

  const state = config[tab as keyof typeof config] || config.pending
  const IconComponent = state.icon

  return (
    <Card className="relative overflow-hidden border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Decorative grain texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wMiIvPjwvc3ZnPg==')] pointer-events-none"></div>

      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full blur-3xl"></div>

      <div className="relative py-16 px-6">
        <div className="flex flex-col items-center justify-center gap-6 text-center max-w-md mx-auto">
          {/* Premium icon container */}
          <div className={`p-5 rounded-2xl ${state.iconBg} shadow-sm`}>
            <IconComponent className={`h-10 w-10 ${state.iconColor}`} />
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
              {t(state.titleKey)}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {t(state.descriptionKey)}
            </p>
          </div>

          {/* Hint badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">
              {t(state.hintKey)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ClientReviewPage
