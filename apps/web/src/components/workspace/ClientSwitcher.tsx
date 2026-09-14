import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Search, Check, Clock } from 'lucide-react';
import { useClients } from '@/hooks/data/useClients';
import { useClientContext } from '@/contexts/ClientContext';
import { useOrganization } from '@/hooks/data/useOrganization';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * ClientSwitcher - Enterprise-grade client switching for agency users
 *
 * Features:
 * - Slug-based URL routing (/clients/:clientSlug/*)
 * - Path preservation when switching (maintains current page context)
 * - Search functionality for quick client filtering
 * - Recent clients section (last 3 accessed)
 * - Keyboard navigation support
 *
 * URL Pattern:
 * /clients/:clientSlug/* → /clients/:newClientSlug/*
 * Example: /clients/acme/agents/strategy → /clients/globalretail/agents/strategy
 */
export function ClientSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientSlug } = useClientContext();
  const { isAgency } = useOrganization();
  const { data: clients, isLoading } = useClients();

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when popover opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  // Get recent clients from localStorage (last 3)
  const recentClientSlugs = useMemo(() => {
    try {
      const stored = localStorage.getItem('recentClients');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [open]); // Re-read when popover opens

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchQuery) return clients;

    const query = searchQuery.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.slug?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  // Separate recent and other clients
  const { recentClients, otherClients } = useMemo(() => {
    if (!filteredClients) return { recentClients: [], otherClients: [] };

    const recent = filteredClients.filter(c =>
      recentClientSlugs.includes(c.slug)
    ).sort((a, b) => {
      const aIndex = recentClientSlugs.indexOf(a.slug);
      const bIndex = recentClientSlugs.indexOf(b.slug);
      return aIndex - bIndex;
    });

    const other = filteredClients.filter(c =>
      !recentClientSlugs.includes(c.slug)
    ).sort((a, b) => a.name.localeCompare(b.name));

    return { recentClients: recent, otherClients: other };
  }, [filteredClients, recentClientSlugs]);

  // Get current client name for display
  const currentClient = clients?.find(c => c.slug === clientSlug);

  // Don't show for SME organizations
  if (!isAgency) return null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-[240px] h-10 bg-gray-100 animate-pulse rounded-md dark:bg-gray-800" />
    );
  }

  // Show empty state if no clients
  if (!clients || clients.length === 0) {
    return (
      <div className="w-[240px] px-3 py-2 text-sm text-gray-500 border rounded-md dark:text-gray-400 dark:border-gray-700">
        No clients yet
      </div>
    );
  }

  /**
   * Handle client switch with path preservation
   *
   * Examples:
   * - /clients/acme/agents/strategy → /clients/globalretail/agents/strategy
   * - /clients/acme/campaigns → /clients/globalretail/campaigns
   * - /clients/acme → /clients/globalretail
   */
  const handleClientSwitch = (newClientSlug: string) => {
    if (newClientSlug === clientSlug) {
      setOpen(false);
      return;
    }

    // Update recent clients in localStorage
    try {
      const updated = [
        newClientSlug,
        ...recentClientSlugs.filter((s: string) => s !== newClientSlug)
      ].slice(0, 3); // Keep only last 3

      localStorage.setItem('recentClients', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update recent clients:', error);
    }

    // Preserve path after /clients/:clientSlug
    const pathAfterClient = location.pathname.split('/').slice(3).join('/');
    const newPath = pathAfterClient
      ? `/clients/${newClientSlug}/${pathAfterClient}`
      : `/clients/${newClientSlug}`;

    setOpen(false);
    navigate(newPath);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a client"
          className="w-[240px] justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {currentClient?.name || 'Select client...'}
            </span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-2 h-4 w-4 flex-shrink-0 opacity-50"
          >
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={searchInputRef}
            placeholder="Search clients..."
            className="h-11 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Client List */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {/* Recent Clients Section */}
          {recentClients.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent
              </div>
              {recentClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleClientSwitch(client.slug!)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    client.slug === clientSlug && "bg-accent"
                  )}
                >
                  <Building2 className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate text-left">{client.name}</span>
                  {client.slug === clientSlug && (
                    <Check className="ml-2 h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              ))}
              {otherClients.length > 0 && (
                <div className="mx-2 my-1 border-t" />
              )}
            </>
          )}

          {/* All Clients Section */}
          {otherClients.length > 0 && (
            <>
              {recentClients.length > 0 && (
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  All Clients
                </div>
              )}
              {otherClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleClientSwitch(client.slug!)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    client.slug === clientSlug && "bg-accent"
                  )}
                >
                  <Building2 className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate text-left">{client.name}</span>
                  {client.slug === clientSlug && (
                    <Check className="ml-2 h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}

          {/* No Results */}
          {filteredClients.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No clients found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
