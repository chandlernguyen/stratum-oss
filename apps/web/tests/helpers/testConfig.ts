/**
 * Test Configuration Helper
 * Loads test environment variables and provides test utilities
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

/**
 * Test User Configurations
 */
export const testUsers = {
  // SME Users (existing in database)
  sme: {
    owner: {
      email: process.env.TEST_SME_OWNER_EMAIL || 'sme.owner@example.com',
      password: process.env.TEST_SME_OWNER_PASSWORD || 'LocalDevOnly123!',
      expectedRole: 'sme_owner',
      orgType: 'SME'
    },
    admin: {
      email: process.env.TEST_SME_ADMIN_EMAIL || 'sme.admin@example.com',
      password: process.env.TEST_SME_ADMIN_PASSWORD || 'SMEAdmin2025!@#',
      expectedRole: 'sme_marketing_director',
      orgType: 'SME'
    },
    manager: {
      email: process.env.TEST_SME_MANAGER_EMAIL || 'sme.manager@example.com',
      password: process.env.TEST_SME_MANAGER_PASSWORD || 'SMEManager2025!@#',
      expectedRole: 'sme_marketing_manager',
      orgType: 'SME'
    },
    analyst: {
      email: process.env.TEST_SME_ANALYST_EMAIL || 'sme.analyst@example.com',
      password: process.env.TEST_SME_ANALYST_PASSWORD || 'SMEAnalyst2025!@#',
      expectedRole: 'sme_analyst',
      orgType: 'SME'
    }
  },
  
  // Agency Users (existing in database)
  agency: {
    owner: {
      email: process.env.TEST_AGENCY_OWNER_EMAIL || 'agency.owner@example.com',
      password: process.env.TEST_AGENCY_OWNER_PASSWORD || 'LocalDevOnly123!',
      expectedRole: 'agency_owner',
      orgType: 'AGENCY'
    },
    admin: {
      email: process.env.TEST_AGENCY_ADMIN_EMAIL || 'agency.admin@example.com',
      password: process.env.TEST_AGENCY_ADMIN_PASSWORD || 'AgencyAdmin2025!@#',
      expectedRole: 'agency_admin',
      orgType: 'AGENCY'
    },
    accountManager: {
      email: process.env.TEST_ACCOUNT_MANAGER_EMAIL || 'account.manager@example.com',
      password: process.env.TEST_ACCOUNT_MANAGER_PASSWORD || 'LocalDevOnly123!',
      expectedRole: 'account_manager',
      orgType: 'AGENCY'
    }
  },
  
  // Primary test user
  primary: {
    email: process.env.TEST_PRIMARY_EMAIL || 'test@example.com',
    password: process.env.TEST_PRIMARY_PASSWORD || 'LocalDevOnly123!',
    expectedRole: 'sme_owner',
    orgType: 'SME'
  },

  // Billing test users (every tier × trial/active)
  billing: {
    free: {
      email: 'billing.free@example.com',
      password: 'LocalDevOnly123!',
      orgType: 'SME' as const,
      subscriptionTier: 'free',
      subscriptionStatus: 'inactive',
      maxSeats: 1,
    },
    soloTrial: {
      email: 'billing.solo.trial@example.com',
      password: 'LocalDevOnly123!',
      orgType: 'SME' as const,
      subscriptionTier: 'solo',
      subscriptionStatus: 'trial',
      maxSeats: 1,
    },
    solo: {
      email: 'billing.solo@example.com',
      password: 'LocalDevOnly123!',
      orgType: 'SME' as const,
      subscriptionTier: 'solo',
      subscriptionStatus: 'active',
      maxSeats: 1,
    },
    teamTrial: {
      email: 'billing.team.trial@example.com',
      password: 'LocalDevOnly123!',
      orgType: 'SME' as const,
      subscriptionTier: 'team',
      subscriptionStatus: 'trial',
      maxSeats: 3,
    },
    team: {
      email: 'billing.team@example.com',
      password: 'LocalDevOnly123!',
      orgType: 'SME' as const,
      subscriptionTier: 'team',
      subscriptionStatus: 'active',
      maxSeats: 3,
    },
    agencyTrial: {
      email: 'billing.agency.trial@example.com',
      password: 'LocalDevOnly123!',
      orgType: 'AGENCY' as const,
      subscriptionTier: 'agency',
      subscriptionStatus: 'trial',
      maxSeats: 10,
    },
    agency: {
      email: 'billing.agency@example.com',
      password: 'LocalDevOnly123!',
      orgType: 'AGENCY' as const,
      subscriptionTier: 'agency',
      subscriptionStatus: 'active',
      maxSeats: 10,
    },
    expired: {
      email: 'billing.expired@example.com',
      password: 'LocalDevOnly123!',
      orgType: 'SME' as const,
      subscriptionTier: 'solo',
      subscriptionStatus: 'trial',
      maxSeats: 1,
    },
    pastDue: {
      email: 'billing.pastdue@example.com',
      password: 'LocalDevOnly123!',
      orgType: 'SME' as const,
      subscriptionTier: 'team',
      subscriptionStatus: 'past_due',
      maxSeats: 3,
    },
  }
}

/**
 * Test Organizations (existing in database)
 */
export const testOrganizations = {
  sme: {
    name: process.env.TEST_SME_ORG_NAME || 'Test SME Company',
    id: process.env.TEST_SME_ORG_ID || '0be24edc-ef38-48f9-b364-b6711c13b6e0',
    type: 'SME',
    slug: 'test-sme-company'
  },
  agency: {
    name: process.env.TEST_AGENCY_ORG_NAME || 'Test Agency Inc',
    id: process.env.TEST_AGENCY_ORG_ID || '95486c45-7a0b-4ac9-828c-6a142408a0f4',
    type: 'AGENCY',
    slug: 'test-agency-inc'
  }
}

/**
 * Generate unique test email for signup tests
 */
export const generateTestEmail = (prefix: string = 'test'): string => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `${prefix}.${timestamp}.${random}@test.local`
}

/**
 * Generate test organization name
 */
export const generateTestOrgName = (type: 'SME' | 'AGENCY' = 'SME'): string => {
  const timestamp = Date.now()
  const prefix = type === 'SME' ? 'Test Company' : 'Test Agency'
  return `${prefix} ${timestamp}`
}

/**
 * Default test password for new signups
 */
export const defaultTestPassword = process.env.TEST_NEW_USER_PASSWORD || 'TestUser2024!@#'

/**
 * API Configuration
 */
export const apiConfig = {
  baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:56300',
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:56321',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
}

/**
 * Expected role mappings for new role system
 */
export const expectedRoles = {
  sme: {
    owner: 'sme_owner',
    admin: 'sme_marketing_director',
    manager: 'sme_marketing_manager',
    analyst: 'sme_analyst'
  },
  agency: {
    owner: 'agency_owner',
    admin: 'agency_admin',
    accountManager: 'account_manager',
    creativeDirector: 'creative_director',
    clientStakeholder: 'client_stakeholder'
  }
}

/**
 * Test timeouts
 */
export const timeouts = {
  short: 5000,
  medium: 10000,
  long: 30000
}

/**
 * Common selectors
 */
export const selectors = {
  emailInput: 'input[type="email"]',
  passwordInput: 'input#password, input[name="password"]',
  confirmPasswordInput: 'input#confirmPassword, input[name="confirmPassword"]',
  orgNameInput: 'input#organizationName, input[placeholder*="organization" i]',
  submitButton: 'button[type="submit"]',
  smeRadio: 'input[value="SME"], label[for="sme"]',
  agencyRadio: 'input[value="AGENCY"], label[for="agency"]',
  slugPreview: 'span.font-mono.font-semibold',
  errorMessage: '.error-message, [role="alert"], .text-red-500',
  dashboard: 'text=/Dashboard|Welcome/i',
  loginButton: 'button:has-text("Sign In"), button:has-text("Login")',
};
