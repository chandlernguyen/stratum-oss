# API Migration Guide

## Overview
This guide shows how to migrate frontend components from direct API calls to the new unified API client.

## Quick Start

### 1. Import the new API client

```typescript
// Old way
import { api } from '@/lib/api';

// New way
import apiClient, { campaignsAPI, StandardResponse } from '@/lib/api-client';
```

### 2. Migration Examples

#### Example 1: Fetching a list of campaigns

**Before:**
```typescript
const fetchCampaigns = async () => {
  try {
    const response = await api.get('/api/v1/campaigns/');
    setCampaigns(response.data);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
  }
};
```

**After:**
```typescript
const fetchCampaigns = async () => {
  try {
    const response = await campaignsAPI.list();
    if (response.success) {
      setCampaigns(response.data || []);
    } else {
      console.error('Failed to fetch campaigns:', response.message);
    }
  } catch (error) {
    console.error('Error fetching campaigns:', error);
  }
};
```

#### Example 2: Creating a new campaign

**Before:**
```typescript
const createCampaign = async (data: any) => {
  try {
    const response = await api.post('/api/v1/campaigns/', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

**After:**
```typescript
const createCampaign = async (data: CampaignCreate) => {
  try {
    const response = await campaignsAPI.create(data);
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to create campaign');
    }
  } catch (error) {
    throw error;
  }
};
```

#### Example 3: Using custom endpoints

**Before:**
```typescript
const activateCampaign = async (campaignId: string) => {
  try {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/activate`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

**After:**
```typescript
import { campaignHelpers } from '@/lib/api-client';

const activateCampaign = async (campaignId: string) => {
  try {
    const response = await campaignHelpers.activate(campaignId);
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to activate campaign');
    }
  } catch (error) {
    throw error;
  }
};
```

## Complete Component Migration Example

### Before (CampaignsList.tsx):
```typescript
import { api } from '@/lib/api';

const CampaignsList = () => {
  const [campaigns, setCampaigns] = useState([]);

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/api/v1/campaigns/');
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      await api.delete(`/api/v1/campaigns/${id}`);
      fetchCampaigns();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // ... rest of component
};
```

### After (CampaignsList.tsx):
```typescript
import { campaignsAPI, type Campaign } from '@/lib/api-client';

const CampaignsList = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const fetchCampaigns = async () => {
    try {
      const response = await campaignsAPI.list({
        sort_by: 'created_at',
        sort_order: 'desc',
        limit: 50
      });

      if (response.success) {
        setCampaigns(response.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const response = await campaignsAPI.delete(id, 'User requested deletion');
      if (response.success) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // ... rest of component
};
```

## API Client Features

### Pagination
```typescript
const response = await campaignsAPI.list({
  skip: 0,
  limit: 20,
  sort_by: 'created_at',
  sort_order: 'desc'
});
```

### Filtering
```typescript
const response = await campaignsAPI.list({
  filters: {
    status: 'active',
    client_id: 'abc-123'
  }
});
```

### Including Archived Items
```typescript
const response = await campaignsAPI.list({
  include_archived: true
});
```

### Bulk Operations
```typescript
// Bulk delete
await campaignsAPI.bulkDelete({
  ids: ['id1', 'id2', 'id3'],
  reason: 'Cleaning up test campaigns'
});

// Bulk update
await campaignsAPI.bulkUpdate({
  ids: ['id1', 'id2'],
  updates: { status: 'paused' }
});
```

### Export Data
```typescript
const blob = await campaignsAPI.export({
  format: 'csv',
  include_archived: false
});

// Create download link
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'campaigns.csv';
link.click();
```

## Available API Clients

- `campaignsAPI` - Campaign management
- `brandGuidelinesAPI` - Brand guidelines
- `personasAPI` - Synthetic personas
- `strategiesAPI` - Marketing strategies
- `organizationsAPI` - Organization management
- `clientsAPI` - Client management
- `documentsAPI` - Document management

## Helper Methods

Each resource has helper methods for custom endpoints:

- `campaignHelpers` - activate, getAnalytics, updateStatus
- `brandGuidelineHelpers` - getActive, setDefault
- `personaHelpers` - getCampaignPersonas, getPrimary, setPrimary, interview
- `strategyHelpers` - getCampaignStrategies, getActive, getZeroBudget, generateOutputs
- `organizationHelpers` - getCurrentWorkspace, switchWorkspace, getAvailable, inviteMember, getMembers
- `clientHelpers` - getActive, getCampaigns, getAnalytics, createQuickCampaign, getHealthScores
- `documentHelpers` - upload, search, getStats, getRecent, reprocess, getChunks

## TypeScript Support

The API client is fully typed. Import types as needed:

```typescript
import type {
  Campaign,
  BrandGuideline,
  SyntheticPersona,
  MarketingStrategy,
  Organization,
  Client,
  Document,
  StandardResponse,
  StandardListResponse
} from '@/lib/api-client';
```

## Error Handling

All methods return a `StandardResponse` with a `success` boolean:

```typescript
const response = await campaignsAPI.create(data);

if (response.success) {
  // Handle success
  console.log('Created:', response.data);
  toast.success(response.message || 'Campaign created');
} else {
  // Handle failure
  console.error('Failed:', response.message);
  toast.error(response.message || 'Failed to create campaign');
}
```

## Migration Checklist

- [ ] Replace `api.get` with appropriate API client `.list()` or `.get()` methods
- [ ] Replace `api.post` with `.create()` or custom helper methods
- [ ] Replace `api.patch`/`api.put` with `.update()` methods
- [ ] Replace `api.delete` with `.delete()` methods (now soft-delete by default)
- [ ] Update error handling to check `response.success`
- [ ] Add TypeScript types for better type safety
- [ ] Use helper methods for custom endpoints
- [ ] Update any pagination/filtering to use new parameters