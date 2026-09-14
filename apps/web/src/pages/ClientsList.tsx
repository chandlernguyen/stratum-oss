import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Plus,
  Search,
  ArrowRight,
  BarChart3,
  Target,
  Calendar,
  Archive,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardClients } from '@/hooks/data/useDashboardMetrics';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useClientAccess } from '@/hooks/data/useUserContextEnhanced';
import { useState, useMemo } from 'react';
import { ResourceActionsDropdown } from '@/components/ResourceActionsDropdown';
import { RESOURCE_CONFIGS } from '@/config/resource-configs';
import { useArchiveClient, useDeleteClient, useRestoreClient } from '@/hooks/data/useClients';
import { useArchiveConfirmation } from '@/hooks/useConfirmDialog';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * Clients List Page
 *
 * Dedicated page for agency users to view and manage all clients.
 * Part of Phase 2 Week 2 Days 6-7 implementation.
 */
export function ClientsList() {
  const { t } = useTranslation('clients');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const { canManageClients } = useUserRoles();

  // Get client access permissions for filtering
  const { accessibleClients, hasOrgLevelAccess, isLoading: accessLoading } = useClientAccess();

  // Get filter from URL or default to 'active'
  const selectedFilter = (searchParams.get('filter') || 'active') as 'active' | 'archived' | 'all';

  // Fetch clients based on selected filter
  const includeArchived = selectedFilter === 'archived' || selectedFilter === 'all';
  const { data: allClients = [], isLoading: clientsLoading, refetch } = useDashboardClients(100, includeArchived);

  // Filter clients based on user's access level (client-scoped roles only see assigned clients)
  const accessibleClientIds = useMemo(() =>
    accessibleClients.map(c => c.id),
    [accessibleClients]
  );

  const accessFilteredClients = useMemo(() => {
    // Org-level users (owners, admins, strategists) see all clients
    if (hasOrgLevelAccess) {
      return allClients;
    }
    // Client-scoped users only see their assigned clients
    return allClients.filter(client => accessibleClientIds.includes(client.id));
  }, [allClients, hasOrgLevelAccess, accessibleClientIds]);

  // Filter clients based on selected tab (active/archived/all)
  const clients = accessFilteredClients.filter(client => {
    if (selectedFilter === 'active') return !client.archived_at;
    if (selectedFilter === 'archived') return !!client.archived_at;
    return true; // 'all' shows everything
  });

  // Calculate counts for tabs (based on access-filtered clients)
  const activeCount = accessFilteredClients.filter(c => !c.archived_at).length;
  const archivedCount = accessFilteredClients.filter(c => !!c.archived_at).length;

  // Combined loading state
  const isLoading = clientsLoading || accessLoading;

  // Use schema-aware mutations
  const archiveClient = useArchiveClient();
  const deleteClient = useDeleteClient();
  const restoreClient = useRestoreClient();

  // Confirmation dialogs
  const { confirmArchive, dialogProps: archiveDialogProps } = useArchiveConfirmation();
  const { confirmDelete, DeleteDialog } = useDeleteConfirmation();

  const handleFilterChange = (value: string) => {
    setSearchParams({ filter: value });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'churned':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Custom archive handler using schema-aware router function
  const handleArchive = async (client: any) => {
    console.log('[ClientsList] Archive requested for:', client.name);

    const result = await confirmArchive({
      resourceName: client.name,
      resourceType: 'Client'
    });

    console.log('[ClientsList] Confirmation result:', result);

    if (result.confirmed) {
      const archiveReason = result.reason || 'No reason provided';
      console.log('[ClientsList] Archiving client with reason:', { id: client.id, reason: archiveReason });
      try {
        await archiveClient.mutateAsync({
          id: client.id,
          reason: archiveReason
        });
        console.log('[ClientsList] Archive mutation completed successfully');
        toast.success(t('toast.archiveSuccess'));
        refetch();
      } catch (error: any) {
        console.error('[ClientsList] Archive failed with error:', error);
        toast.error(error.message || t('toast.archiveFailed'));
      }
    } else {
      console.log('[ClientsList] Archive cancelled by user');
    }
  };

  // Custom delete handler using schema-aware router function
  const handleDelete = async (client: any) => {
    console.log('[ClientsList] Delete requested for:', client.name);

    const confirmed = await confirmDelete({
      id: client.id,
      name: client.name,
      isArchived: !!client.archived_at
    });

    console.log('[ClientsList] Delete confirmation result:', confirmed);

    if (confirmed) {
      console.log('[ClientsList] Deleting client:', { id: client.id, name: client.name });
      try {
        await deleteClient.mutateAsync({
          id: client.id
        });
        console.log('[ClientsList] Delete mutation completed successfully');
        toast.success(t('toast.deleteSuccess'));
        refetch();
      } catch (error: any) {
        console.error('[ClientsList] Delete failed with error:', error);
        toast.error(error.message || t('toast.deleteFailed'));
      }
    } else {
      console.log('[ClientsList] Delete cancelled by user');
    }
  };

  // Custom restore handler using schema-aware router function
  const handleRestore = async (client: any) => {
    console.log('[ClientsList] Restore requested for:', client.name);
    try {
      await restoreClient.mutateAsync({
        id: client.id
      });
      console.log('[ClientsList] Restore mutation completed successfully');
      toast.success(t('toast.restoreSuccess'));
      refetch();
    } catch (error: any) {
      console.error('[ClientsList] Restore failed with error:', error);
      toast.error(error.message || t('toast.restoreFailed'));
    }
  };

  // Filter clients by search query
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        {/* Premium loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className={cn(
              "overflow-hidden animate-pulse",
              "border-slate-200/80 dark:border-slate-700/80"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Bento Grid Layout - 12 column foundation */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">

        {/* Header - Full Width with premium styling */}
        <div className="col-span-1 md:col-span-6 lg:col-span-12">
          <div className="relative">
            {/* Decorative background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -mx-4 md:-mx-6 -mt-4 rounded-3xl">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-20 w-48 h-48 bg-slate-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                {/* Premium badge */}
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4",
                  "bg-gradient-to-r from-blue-500/10 to-blue-600/10",
                  "border border-blue-500/20"
                )}>
                  <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    {t('badge')}
                  </span>
                </div>

                {/* Serif heading */}
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {t('title')}
                </h1>
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-md">
                  {t('subtitle')}
                </p>
              </div>
              {canManageClients && (
                <Button
                  asChild
                  className={cn(
                    "min-h-12 md:min-h-10 w-full md:w-auto",
                    "bg-gradient-to-r from-amber-500 to-amber-600",
                    "hover:from-amber-600 hover:to-amber-700",
                    "shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30",
                    "transition-all duration-200"
                  )}
                >
                  <Link to="/clients/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addClient')}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs - Full Width */}
        <div className="col-span-1 md:col-span-6 lg:col-span-12">
          {/* Mobile: Status Dropdown */}
          <div className="md:hidden">
            <label htmlFor="client-filter-mobile" className="block text-sm font-medium text-muted-foreground mb-2">
              {t('filters.label')}
            </label>
            <select
              id="client-filter-mobile"
              value={selectedFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full min-h-12 px-4 py-3 bg-background border border-input rounded-md text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="active">{t('filters.active')} ({activeCount})</option>
              <option value="archived">{t('filters.archived')} ({archivedCount})</option>
              <option value="all">{t('filters.all')} ({accessFilteredClients.length})</option>
            </select>
          </div>

          {/* Desktop: Tabs */}
          <Tabs value={selectedFilter} onValueChange={handleFilterChange} className="hidden md:block">
            <TabsList>
              <TabsTrigger value="active">
                {t('filters.active')}
                {activeCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archived">
                <Archive className="h-4 w-4 mr-1" />
                {t('filters.archived')}
                {archivedCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {archivedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                {t('filters.all')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search Bar - Full Width with premium styling */}
        <div className="col-span-1 md:col-span-6 lg:col-span-12">
          <div className="relative group">
            <div className={cn(
              "absolute left-3 top-1/2 transform -translate-y-1/2",
              "p-1.5 rounded-md",
              "bg-slate-100 dark:bg-slate-800",
              "group-focus-within:bg-blue-100 dark:group-focus-within:bg-blue-900/30",
              "transition-colors duration-200"
            )}>
              <Search className={cn(
                "h-3.5 w-3.5",
                "text-slate-500 dark:text-slate-400",
                "group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400",
                "transition-colors duration-200"
              )} />
            </div>
            <Input
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-12 min-h-12 md:min-h-10",
                "border-slate-200 dark:border-slate-700",
                "focus:border-blue-400 dark:focus:border-blue-500",
                "focus:ring-blue-500/20",
                "transition-all duration-200"
              )}
            />
          </div>
        </div>

        {/* Clients List - Full Width */}
        <div className="col-span-1 md:col-span-6 lg:col-span-12">
          {filteredClients.length === 0 ? (
            <Card className={cn(
              "relative overflow-hidden",
              "border-slate-200/80 dark:border-slate-700/80",
              "shadow-xl shadow-slate-900/5 dark:shadow-black/20"
            )}>
              {/* Grain texture */}
              <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
                <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
              </div>

              <CardContent className="relative py-16 text-center">
                {selectedFilter === 'archived' ? (
                  <>
                    <div className={cn(
                      "inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6",
                      "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800",
                      "shadow-lg shadow-slate-900/10 dark:shadow-black/20"
                    )}>
                      <Archive className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {t('emptyState.noArchived.title')}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                      {t('emptyState.noArchived.description')}
                    </p>
                    {activeCount > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => handleFilterChange('active')}
                        className={cn(
                          "border-slate-200 dark:border-slate-700",
                          "hover:border-blue-400/50 dark:hover:border-blue-500/50",
                          "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        )}
                      >
                        {t('emptyState.noArchived.viewActive')}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <div className={cn(
                      "inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6",
                      "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50",
                      "shadow-lg shadow-blue-900/10 dark:shadow-black/20"
                    )}>
                      <Building2 className="w-10 h-10 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h3 className="font-serif text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                      {searchQuery ? t('emptyState.noResults.title') : t('emptyState.noClients.title')}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                      {searchQuery
                        ? t('emptyState.noResults.description')
                        : t('emptyState.noClients.description')}
                    </p>
                    {canManageClients && !searchQuery && (
                      <Button
                        asChild
                        className={cn(
                          "min-h-12 md:min-h-10",
                          "bg-gradient-to-r from-amber-500 to-amber-600",
                          "hover:from-amber-600 hover:to-amber-700",
                          "shadow-lg shadow-amber-500/25"
                        )}
                      >
                        <Link to="/clients/new">
                          <Plus className="mr-2 h-4 w-4" />
                          {t('addFirstClient')}
                        </Link>
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-[calc(100vh-500px)] overflow-y-auto pr-2 scroll-smooth">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((client) => {
                  const isArchived = !!client.archived_at;
                  return (
                    <Card
                      key={client.id}
                      className={cn(
                        "group relative overflow-hidden transition-all duration-300",
                        "border-slate-200/80 dark:border-slate-700/80",
                        "hover:border-blue-400/50 dark:hover:border-blue-500/50",
                        "hover:shadow-xl hover:shadow-blue-500/10",
                        "hover:-translate-y-0.5",
                        isArchived && "opacity-75"
                      )}
                    >
                      {/* Grain texture */}
                      <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
                        <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
                      </div>

                      <CardHeader className="relative pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="mb-1.5 text-lg">
                              {isArchived ? (
                                <span className="text-slate-500 dark:text-slate-400">{client.name}</span>
                              ) : (
                                <Link
                                  to={`/clients/${client.slug}`}
                                  className={cn(
                                    "text-slate-900 dark:text-slate-100",
                                    "hover:text-blue-600 dark:hover:text-blue-400",
                                    "transition-colors"
                                  )}
                                >
                                  {client.name}
                                </Link>
                              )}
                            </CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400">
                              {client.industry || t('card.noIndustry')}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isArchived ? (
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              >
                                <Archive className="h-3 w-3 mr-1" />
                                {t('card.archivedBadge')}
                              </Badge>
                            ) : (
                              <Badge
                                variant={getStatusColor(client.status || 'active') as any}
                                className={cn(
                                  client.status === 'active' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                )}
                              >
                                {client.status || 'active'}
                              </Badge>
                            )}
                            {canManageClients && (
                              <ResourceActionsDropdown
                                item={client}
                                config={RESOURCE_CONFIGS.client}
                                showView={false}
                                showEdit={!isArchived}
                                showCopy={false}
                                showArchive={!isArchived}
                                showRestore={isArchived}
                                showDelete={true}
                                onEdit={(client) => {
                                  navigate(`/clients/${client.slug}/edit`);
                                }}
                                onArchive={(client) => {
                                  handleArchive(client);
                                }}
                                onRestore={(client) => {
                                  handleRestore(client);
                                }}
                                onDelete={(client) => {
                                  handleDelete(client);
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="relative">
                        <div className="space-y-3">
                          {/* Archive Info */}
                          {isArchived && client.archived_at && (
                            <div className={cn(
                              "flex items-center justify-between text-sm rounded-lg px-3 py-2",
                              "bg-slate-50 dark:bg-slate-800/50"
                            )}>
                              <span className="text-slate-500 dark:text-slate-400">{t('card.archivedOn')}</span>
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                {format(new Date(client.archived_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                          {isArchived && client.archive_reason && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                              {t('card.reason', { reason: client.archive_reason })}
                            </p>
                          )}

                          {/* Stats with icon containers */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <div className={cn(
                                "p-1 rounded",
                                "bg-blue-100 dark:bg-blue-900/30"
                              )}>
                                <Target className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </div>
                              {t('card.campaigns')}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {t('card.campaignsCount', { active: client.active_campaigns || 0, total: client.campaigns_count || 0 })}
                            </span>
                          </div>

                          {client.created_at && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <div className={cn(
                                  "p-1 rounded",
                                  "bg-slate-100 dark:bg-slate-800"
                                )}>
                                  <Calendar className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                </div>
                                {t('card.clientSince')}
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {format(new Date(client.created_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            {isArchived ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "flex-1 min-h-11 md:min-h-9",
                                  "border-slate-200 dark:border-slate-700",
                                  "hover:border-blue-400/50 dark:hover:border-blue-500/50",
                                  "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                )}
                                onClick={() => handleRestore(client)}
                              >
                                {t('card.restoreClient')}
                              </Button>
                            ) : (
                              <>
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "flex-1 min-h-11 md:min-h-9",
                                    "border-slate-200 dark:border-slate-700",
                                    "hover:border-blue-400/50 dark:hover:border-blue-500/50",
                                    "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  )}
                                >
                                  <Link to={`/clients/${client.slug}`}>
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    {t('card.dashboard')}
                                  </Link>
                                </Button>
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "min-h-11 md:min-h-9",
                                    "hover:bg-slate-100 dark:hover:bg-slate-800",
                                    "group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                  )}
                                >
                                  <Link
                                    to={`/clients/${client.slug}/campaigns`}
                                    aria-label={t('card.viewCampaignsAriaLabel', { clientName: client.name })}
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog {...archiveDialogProps} />
      <DeleteDialog />
    </div>
  );
}

export default ClientsList;
