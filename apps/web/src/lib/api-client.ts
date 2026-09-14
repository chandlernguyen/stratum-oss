/**
 * Unified API Client for Standardized Backend Endpoints
 *
 * This client provides a consistent interface for all API operations
 * following the new BaseRouter pattern implemented in the backend.
 */

import { api } from './api';

// Standard response types matching backend StandardResponse
export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  metadata?: Record<string, any>;
}

export interface StandardListResponse<T = any> extends StandardResponse<T[]> {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Common query parameters for list operations
export interface ListParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  include_archived?: boolean;
  filters?: Record<string, any>;
}

// Bulk operation interfaces
export interface BulkDeleteRequest {
  ids: string[];
  reason?: string;
}

export interface BulkUpdateRequest {
  ids: string[];
  updates: Record<string, any>;
}

export interface ExportParams {
  format?: 'json' | 'csv';
  include_archived?: boolean;
  fields?: string[];
}

/**
 * Generic resource client that implements standard CRUD operations
 * for any resource following the BaseRouter pattern
 */
export class ResourceClient<T, TCreate, TUpdate> {
  private resourcePath: string;

  constructor(resourcePath: string) {
    this.resourcePath = resourcePath;
  }

  /**
   * List resources with pagination and filtering
   */
  async list(params?: ListParams): Promise<StandardListResponse<T>> {
    const response = await api.get<StandardListResponse<T>>(this.resourcePath, { params });
    return response.data;
  }

  /**
   * Get a single resource by ID
   */
  async get(id: string): Promise<StandardResponse<T>> {
    const response = await api.get<StandardResponse<T>>(`${this.resourcePath}/${id}`);
    return response.data;
  }

  /**
   * Create a new resource
   */
  async create(data: TCreate): Promise<StandardResponse<T>> {
    const response = await api.post<StandardResponse<T>>(this.resourcePath, data);
    return response.data;
  }

  /**
   * Update a resource
   */
  async update(id: string, data: TUpdate): Promise<StandardResponse<T>> {
    const response = await api.patch<StandardResponse<T>>(`${this.resourcePath}/${id}`, data);
    return response.data;
  }

  /**
   * Delete (archive) a resource
   */
  async delete(id: string, reason?: string): Promise<StandardResponse> {
    const response = await api.delete<StandardResponse>(`${this.resourcePath}/${id}`, {
      params: reason ? { reason } : undefined
    });
    return response.data;
  }

  /**
   * Restore an archived resource
   */
  async restore(id: string): Promise<StandardResponse<T>> {
    const response = await api.post<StandardResponse<T>>(`${this.resourcePath}/${id}/restore`);
    return response.data;
  }

  /**
   * Bulk delete resources
   */
  async bulkDelete(request: BulkDeleteRequest): Promise<StandardResponse> {
    const response = await api.post<StandardResponse>(`${this.resourcePath}/bulk-delete`, request);
    return response.data;
  }

  /**
   * Bulk update resources
   */
  async bulkUpdate(request: BulkUpdateRequest): Promise<StandardResponse> {
    const response = await api.patch<StandardResponse>(`${this.resourcePath}/bulk-update`, request);
    return response.data;
  }

  /**
   * Bulk create resources
   */
  async bulkCreate(items: TCreate[]): Promise<StandardResponse<T[]>> {
    const response = await api.post<StandardResponse<T[]>>(`${this.resourcePath}/bulk-create`, { items });
    return response.data;
  }

  /**
   * Export resources
   */
  async export(params?: ExportParams): Promise<Blob> {
    const response = await api.get(`${this.resourcePath}/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Duplicate a resource
   */
  async duplicate(id: string, name: string): Promise<StandardResponse<T>> {
    const response = await api.post<StandardResponse<T>>(`${this.resourcePath}/${id}/duplicate`, {
      params: { name }
    });
    return response.data;
  }

  /**
   * Get list of archived resources
   */
  async listArchived(params?: ListParams): Promise<StandardListResponse<T>> {
    return this.list({ ...params, include_archived: true });
  }

  /**
   * Make a custom GET request to a resource endpoint
   */
  async customGet<R = any>(path: string, params?: any): Promise<StandardResponse<R>> {
    const response = await api.get<StandardResponse<R>>(`${this.resourcePath}${path}`, { params });
    return response.data;
  }

  /**
   * Make a custom POST request to a resource endpoint
   */
  async customPost<R = any>(path: string, data?: any): Promise<StandardResponse<R>> {
    const response = await api.post<StandardResponse<R>>(`${this.resourcePath}${path}`, data);
    return response.data;
  }

  /**
   * Make a custom PATCH request to a resource endpoint
   */
  async customPatch<R = any>(path: string, data?: any): Promise<StandardResponse<R>> {
    const response = await api.patch<StandardResponse<R>>(`${this.resourcePath}${path}`, data);
    return response.data;
  }
}

// Type definitions for each resource
export interface Campaign {
  id: string;
  org_id: string;
  client_id?: string;
  name: string;
  description?: string;
  type?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string;
  budget?: number;
  budget_cents?: number;
  spent?: number;
  spent_cents?: number;
  objectives?: any;
  target_audience?: any;
  metrics?: any;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface BrandGuideline {
  id: string;
  org_id: string;
  campaign_id?: string;
  name: string;
  brand_voice?: any;
  writing_style?: any;
  messaging_guidelines?: any;
  content_rules?: any;
  terminology?: any;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface SyntheticPersona {
  id: string;
  org_id: string;
  campaign_id?: string;
  name: string;
  title: string;
  company_name: string;
  industry: string;
  vertical?: string;
  company_size?: string;
  is_primary: boolean;
  demographics?: any;
  personality_traits?: any;
  goals: string[];
  pain_points: string[];
  jobs_to_be_done: string[];
  current_tools: string[];
  objections: string[];
  preferred_channels: string[];
  decision_criteria?: any;
  buyer_journey?: any;
  domain_expertise?: any;
  tags: string[];
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface MarketingStrategy {
  id: string;
  org_id: string;
  campaign_id?: string;
  name: string;
  description?: string;
  strategy_type?: string;
  target_audience?: any;
  messaging_framework?: any;
  channel_strategy?: any;
  content_strategy?: any;
  metrics?: any;
  budget_allocation?: any;
  timeline?: any;
  zero_budget_tactics: string[];
  quick_wins: string[];
  risks_and_mitigation?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  size?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface Client {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: 'active' | 'paused' | 'churned';
  monthly_budget?: number;
  campaigns_count?: number;
  active_campaigns?: number;
  total_spent?: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface Document {
  id: string;
  org_id: string;
  client_id?: string;
  campaign_id?: string;
  persona_id?: string;
  strategy_session_id?: string;
  title: string;
  description?: string;
  document_type?: string;
  gcs_uri?: string;
  file_name?: string;
  metadata?: any;
  tags: string[];
  visibility: string;
  chunk_count?: number;
  vector_count?: number;
  processing_status?: string;
  processing_error?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

// Pre-configured API clients for each resource
export const campaignsAPI = new ResourceClient<Campaign, Partial<Campaign>, Partial<Campaign>>('/api/v1/campaigns');
export const brandGuidelinesAPI = new ResourceClient<BrandGuideline, Partial<BrandGuideline>, Partial<BrandGuideline>>('/api/v1/brand-guidelines');
export const personasAPI = new ResourceClient<SyntheticPersona, Partial<SyntheticPersona>, Partial<SyntheticPersona>>('/api/v1/personas');
export const strategiesAPI = new ResourceClient<MarketingStrategy, Partial<MarketingStrategy>, Partial<MarketingStrategy>>('/api/v1/marketing-strategies');
export const organizationsAPI = new ResourceClient<Organization, Partial<Organization>, Partial<Organization>>('/api/v1/organizations');
export const clientsAPI = new ResourceClient<Client, Partial<Client>, Partial<Client>>('/api/v1/clients');
export const documentsAPI = new ResourceClient<Document, Partial<Document>, Partial<Document>>('/api/v1/documents');

// Custom endpoint helpers for specific resources
export const campaignHelpers = {
  async activate(campaignId: string) {
    return campaignsAPI.customPost(`/${campaignId}/activate`);
  },
  async getAnalytics(campaignId: string) {
    return campaignsAPI.customGet(`/${campaignId}/analytics`);
  },
  async updateStatus(campaignId: string, status: Campaign['status']) {
    return campaignsAPI.customPatch(`/${campaignId}/status`, { new_status: status });
  }
};

export const brandGuidelineHelpers = {
  async getActive(campaignId?: string) {
    return brandGuidelinesAPI.customGet('/active', campaignId ? { campaign_id: campaignId } : undefined);
  },
  async setDefault(guidelineId: string) {
    return brandGuidelinesAPI.customPatch(`/${guidelineId}/set-default`);
  }
};

export const personaHelpers = {
  async getCampaignPersonas(campaignId: string, includeArchived = false) {
    return personasAPI.customGet(`/campaign/${campaignId}`, { include_archived: includeArchived });
  },
  async getPrimary(campaignId?: string) {
    return personasAPI.customGet('/primary', campaignId ? { campaign_id: campaignId } : undefined);
  },
  async setPrimary(personaId: string) {
    return personasAPI.customPatch(`/${personaId}/set-primary`);
  },
  async interview(personaId: string, questions: string[], context?: string) {
    return personasAPI.customPost(`/${personaId}/interview`, { questions, context });
  }
};

export const strategyHelpers = {
  async getCampaignStrategies(campaignId: string, includeArchived = false) {
    return strategiesAPI.customGet(`/campaign/${campaignId}`, { include_archived: includeArchived });
  },
  async getActive(campaignId?: string) {
    return strategiesAPI.customGet('/active', campaignId ? { campaign_id: campaignId } : undefined);
  },
  async getZeroBudget(campaignId?: string) {
    return strategiesAPI.customGet('/zero-budget', campaignId ? { campaign_id: campaignId } : undefined);
  },
  async generateOutputs(strategyId: string, outputTypes: string[]) {
    return strategiesAPI.customPost(`/${strategyId}/generate-outputs`, { output_types: outputTypes });
  }
};

export const organizationHelpers = {
  async getCurrentWorkspace() {
    return organizationsAPI.customGet('/current');
  },
  async switchWorkspace(organizationId: string) {
    return organizationsAPI.customPost('/switch-workspace', { organization_id: organizationId });
  },
  async getAvailable() {
    return organizationsAPI.customGet('/available');
  },
  async inviteMember(organizationId: string, email: string, role = 'member') {
    return organizationsAPI.customPost(`/${organizationId}/invite`, { email, role });
  },
  async getMembers(organizationId: string) {
    return organizationsAPI.customGet(`/${organizationId}/members`);
  },
  async removeMember(organizationId: string, userId: string) {
    return api.delete(`/api/v1/organizations/${organizationId}/members/${userId}`);
  }
};

export const clientHelpers = {
  async getActive() {
    return clientsAPI.customGet('/active');
  },
  async getCampaigns(clientId: string, includeArchived = false) {
    return clientsAPI.customGet(`/${clientId}/campaigns`, { include_archived: includeArchived });
  },
  async getAnalytics(clientId: string) {
    return clientsAPI.customGet(`/${clientId}/analytics`);
  },
  async createQuickCampaign(clientId: string, name: string, type = 'general') {
    return clientsAPI.customPost(`/${clientId}/quick-campaign`, { campaign_name: name, campaign_type: type });
  },
  async getHealthScores() {
    return clientsAPI.customGet('/health-scores');
  }
};

export const documentHelpers = {
  async upload(file: File, metadata: Record<string, any>) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
    const response = await api.post<StandardResponse>('/api/v1/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  async search(query: string, filters?: any) {
    return documentsAPI.customPost('/search', { query, ...filters });
  },
  async getStats(campaignId?: string, clientId?: string) {
    return documentsAPI.customGet('/stats', { campaign_id: campaignId, client_id: clientId });
  },
  async getRecent(limit = 10, campaignId?: string, clientId?: string) {
    return documentsAPI.customGet('/recent', { limit, campaign_id: campaignId, client_id: clientId });
  },
  async reprocess(documentId: string) {
    return documentsAPI.customPost(`/${documentId}/reprocess`);
  },
  async getChunks(documentId: string, limit = 100, offset = 0) {
    return documentsAPI.customGet(`/${documentId}/chunks`, { limit, offset });
  }
};

// Export everything for convenient access
export default {
  campaigns: campaignsAPI,
  brandGuidelines: brandGuidelinesAPI,
  personas: personasAPI,
  strategies: strategiesAPI,
  organizations: organizationsAPI,
  clients: clientsAPI,
  documents: documentsAPI,
  // Helper methods
  campaignHelpers,
  brandGuidelineHelpers,
  personaHelpers,
  strategyHelpers,
  organizationHelpers,
  clientHelpers,
  documentHelpers
};