import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Organization {
  id: string;
  name: string;
  type: 'SME' | 'AGENCY';
  subscription_tier: string;
  settings?: Record<string, any>;
}

export interface User {
  id: string;
  org_id: string;
  full_name?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  org_id: string;
  client_id?: string;
  budget?: number;
}

export interface Client {
  id: string;
  name: string;
  org_id: string;
}

export class TestDataManager {
  private createdEntities: Map<string, string[]> = new Map();
  private db: SupabaseClient;
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:56321';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
    
    this.db = createClient(supabaseUrl, serviceRoleKey);
  }
  
  async setupTestEnvironment(scenario: 'sme' | 'agency' | 'mixed'): Promise<void> {
    console.log(`🔧 Setting up ${scenario} test environment...`);
    
    switch(scenario) {
      case 'sme':
        await this.createSMETestData();
        break;
      case 'agency':
        await this.createAgencyTestData();
        break;
      case 'mixed':
        await this.createSMETestData();
        await this.createAgencyTestData();
        break;
    }
    
    console.log(`✅ Test environment ready`);
  }
  
  private async createSMETestData(): Promise<void> {
    // Create SME organization
    const org = await this.createOrganization({
      name: 'Test SME Corp',
      type: 'SME',
      subscription_tier: 'professional'
    });
    
    // Create test users - using existing test users from the database
    const users = await Promise.all([
      this.createUser(process.env.TEST_PRIMARY_EMAIL || 'test@example.com', 'sme_owner', org.id),  // Use existing test user
      this.createUser(process.env.TEST_SME_OWNER_EMAIL || 'sme.owner@example.com', 'owner', org.id),
      this.createUser('sme.manager@test.com', 'marketing_manager', org.id)  // Fixed role name
    ]);
    
    // Create test campaigns
    const campaigns = await Promise.all([
      this.createCampaign('Active Campaign', 'active', org.id),
      this.createCampaign('Draft Campaign', 'draft', org.id),
      this.createCampaign('Completed Campaign', 'completed', org.id)
    ]);
    
    // Create saved outputs for cross-agent testing
    await this.createSavedOutputs(campaigns[0].id);
    
    this.track('organizations', org.id);
    this.track('users', users.map(u => u.id));
    this.track('campaigns', campaigns.map(c => c.id));
  }
  
  private async createAgencyTestData(): Promise<void> {
    // Create 2 competing agencies for isolation testing
    const agencyA = await this.createOrganization({
      name: 'Agency Alpha',
      type: 'AGENCY',
      subscription_tier: 'enterprise'
    });
    
    const agencyB = await this.createOrganization({
      name: 'Agency Beta',
      type: 'AGENCY',
      subscription_tier: 'enterprise'
    });
    
    // Create clients for each agency
    const clientsA = await Promise.all([
      this.createClient('Nike', agencyA.id),
      this.createClient('Adidas', agencyA.id),
      this.createClient('Puma', agencyA.id)
    ]);
    
    const clientsB = await Promise.all([
      this.createClient('Coca Cola', agencyB.id),
      this.createClient('Pepsi', agencyB.id)
    ]);
    
    // Create campaigns for scale testing (75 campaigns)
    const bulkCampaigns = [];
    for (let i = 0; i < 75; i++) {
      bulkCampaigns.push(
        this.createCampaign(
          `Bulk Campaign ${i}`,
          'draft',
          agencyA.id,
          clientsA[i % 3].id
        )
      );
    }
    await Promise.all(bulkCampaigns);
    
    this.track('organizations', [agencyA.id, agencyB.id]);
    this.track('clients', [...clientsA, ...clientsB].map(c => c.id));
  }
  
  async createOrganization(data: Partial<Organization>): Promise<Organization> {
    const { data: org, error } = await this.db
      .from('organizations')
      .insert({
        name: data.name,
        type: data.type,
        subscription_tier: data.subscription_tier,
        settings: data.settings || {}
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create organization: ${error.message}`);
    return org;
  }
  
  async createUser(email: string, role: string, organizationId: string): Promise<User> {
    // First check if user already exists
    const { data: existingAuth } = await this.db.auth.admin.listUsers();
    const existingUser = existingAuth?.users?.find(u => u.email === email);
    
    let userId: string;
    
    if (existingUser) {
      console.log(`  User ${email} already exists, using existing`);
      userId = existingUser.id;
    } else {
      // Create new auth user
      const { data: authUser, error: authError } = await this.db.auth.admin.createUser({
        email,
        password: 'LocalDevOnly123!',
        email_confirm: true
      });
      
      if (authError) throw new Error(`Failed to create auth user: ${authError.message}`);
      userId = authUser.user.id;
    }
    
    // Check if user profile exists
    const { data: existingProfile } = await this.db
      .from('users')
      .select()
      .eq('id', userId)
      .single();
    
    let user: User;
    
    if (existingProfile) {
      console.log(`  User profile for ${email} already exists`);
      user = existingProfile;
    } else {
      // Create user profile
      const { data: newUser, error } = await this.db
        .from('users')
        .insert({
          id: userId,
          org_id: organizationId,  // Changed from organization_id to org_id
          full_name: email.split('@')[0].replace('.', ' ').replace(/_/g, ' ')
        })
        .select()
        .single();
      
      if (error && !error.message.includes('duplicate key')) {
        throw new Error(`Failed to create user profile: ${error.message}`);
      }
      
      // If we got a duplicate key error, just fetch the existing user
      if (!newUser) {
        const { data: fetchedUser } = await this.db
          .from('users')
          .select()
          .eq('id', userId)
          .single();
        user = fetchedUser || { id: userId, org_id: organizationId, full_name: email };
      } else {
        user = newUser;
      }
    }
    
    // Check if role exists
    const { data: existingRole } = await this.db
      .from('user_roles')
      .select()
      .eq('user_id', user.id)
      .eq('org_id', organizationId)  // Changed from organization_id
      .single();
    
    if (!existingRole) {
      // Create user role
      const { error: roleError } = await this.db
        .from('user_roles')
        .insert({
          user_id: user.id,
          org_id: organizationId,  // Changed from organization_id
          role
        });
      
      if (roleError) console.error(`Warning: Failed to create user role: ${roleError.message}`);
    }
    
    return user;
  }
  
  async createCampaign(
    name: string, 
    status: string, 
    organizationId: string, 
    clientId?: string
  ): Promise<Campaign> {
    const { data: campaign, error } = await this.db
      .from('campaigns')
      .insert({
        name,
        status,
        org_id: organizationId,  // Fixed column name
        client_id: clientId,
        budget_cents: 1000000,  // Fixed column name (10000 dollars in cents)
        objectives: { goals: ['Increase brand awareness', 'Generate leads'] },
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create campaign: ${error.message}`);
    return campaign;
  }
  
  async createClient(name: string, organizationId: string): Promise<Client> {
    const { data: client, error } = await this.db
      .from('clients')
      .insert({
        name,
        org_id: organizationId,  // Fixed column name
        settings: {}
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create client: ${error.message}`);
    return client;
  }
  
  private async createSavedOutputs(campaignId: string): Promise<void> {
    // Get the org_id from the campaign
    const { data: campaign } = await this.db
      .from('campaigns')
      .select('org_id')
      .eq('id', campaignId)
      .single();
    
    if (!campaign) return;
    
    const outputs = [
      {
        org_id: campaign.org_id,
        campaign_id: campaignId,
        source_agent: 'strategy',
        data_type: 'swot_analysis',
        data: { 
          title: 'SWOT Analysis Q3 2025',
          swot: { 
            strengths: ['Strong brand', 'Innovation'], 
            weaknesses: ['Limited budget', 'Small team'],
            opportunities: ['Market growth', 'New channels'],
            threats: ['Competition', 'Economic uncertainty']
          },
          tags: ['analysis', 'strategy', 'q3']
        },
        visibility: ['strategy', 'persona', 'content']
      },
      {
        org_id: campaign.org_id,
        campaign_id: campaignId,
        source_agent: 'persona',
        data_type: 'customer_profile',
        data: { 
          title: 'Target Customer Profile',
          demographics: { 
            age: '25-34',
            income: '$50k-75k',
            location: 'Urban areas'
          },
          psychographics: {
            interests: ['Technology', 'Sustainability'],
            values: ['Quality', 'Innovation']
          },
          tags: ['customer', 'profile']
        },
        visibility: ['persona', 'content', 'analytics']
      },
      {
        org_id: campaign.org_id,
        campaign_id: campaignId,
        source_agent: 'content',
        data_type: 'templates',
        data: { 
          title: 'Social Media Templates',
          templates: [
            { platform: 'Twitter', template: 'Check out our latest...' },
            { platform: 'LinkedIn', template: 'We are excited to announce...' }
          ],
          tags: ['social', 'templates']
        },
        visibility: ['content', 'campaign_execution']
      }
    ];
    
    for (const output of outputs) {
      const { data, error } = await this.db
        .from('agent_shared_data')
        .insert(output)
        .select();
      
      if (error) {
        console.error(`Failed to create saved output: ${error.message}`);
      } else if (data && data[0]) {
        this.track('agent_shared_data', data[0].id);
      }
    }
  }
  
  private track(entity: string, ids: string | string[]): void {
    const idArray = Array.isArray(ids) ? ids : [ids];
    const existing = this.createdEntities.get(entity) || [];
    this.createdEntities.set(entity, [...existing, ...idArray]);
  }
  
  async teardown(): Promise<void> {
    console.log('🧹 Cleaning up test data...');
    
    // Delete in reverse dependency order
    const deleteOrder = [
      'agent_messages',
      'agent_conversations',
      'agent_shared_data',
      'campaigns',
      'clients',
      'user_roles',
      'users',
      'organizations'
    ];
    
    for (const entity of deleteOrder) {
      const ids = this.createdEntities.get(entity);
      if (ids && ids.length > 0) {
        console.log(`  Deleting ${ids.length} ${entity}...`);
        const { error } = await this.db
          .from(entity)
          .delete()
          .in('id', ids);
        
        if (error) {
          console.error(`  Failed to delete ${entity}: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Test data cleaned up');
  }
  
  // Utility to reset specific user's data
  async resetUserData(email: string): Promise<void> {
    const { data: user } = await this.db
      .from('users')
      .select('id, org_id')
      .eq('email', email)
      .single();
    
    if (user) {
      // Delete user's campaigns
      await this.db
        .from('campaigns')
        .delete()
        .eq('org_id', user.org_id);
      
      // Delete user's agent sessions  
      await this.db
        .from('agent_conversations')
        .delete()
        .eq('user_id', user.id);
    }
  }
}