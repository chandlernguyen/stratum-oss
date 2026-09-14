-- =============================================================================
-- SUPABASE SEED FILE - COMPREHENSIVE
-- =============================================================================
-- Creates test users for ALL 15 roles (5 SME + 10 Agency) + billing test users
-- Perfect for testing permissions, RLS, collaboration, and billing flows
--
-- To reset database with this seed:
--   supabase db reset
--
-- Password for ALL test users: LocalDevOnly123!
-- =============================================================================

-- =============================================================================
-- 1. CREATE TEST ORGANIZATIONS
-- =============================================================================

INSERT INTO public.organizations (id, name, slug, type, created_at, updated_at)
VALUES
  ('baa7abb7-742d-4d9e-9112-2a095c17f17c', 'Test SME Company', 'test-sme-company', 'SME', now(), now()),
  ('70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Test Agency Inc', 'test-agency-inc', 'AGENCY', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test SME Onboarding Org', 'test-sme-onboarding-org', 'SME', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test Agency Onboarding Org', 'test-agency-onboarding-org', 'AGENCY', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Set proper subscription tiers for main test orgs
-- SME has 5 users → needs agency tier (10 seats) to avoid plan limit gate
UPDATE public.organizations SET subscription_tier = 'agency', subscription_status = 'active', max_users = 10
WHERE id = 'baa7abb7-742d-4d9e-9112-2a095c17f17c';
UPDATE public.organizations SET subscription_tier = 'agency', subscription_status = 'active', max_users = 15
WHERE id = '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff';

-- =============================================================================
-- 1b. BILLING TEST ORGANIZATIONS (every tier × trial/active)
-- =============================================================================
-- These orgs have explicit billing fields for testing checkout, trials, and paid access.
-- Unlike the permission-testing orgs above, these simulate real subscription lifecycles.
-- Covers: free, solo trial, solo active, team trial, team active, agency trial, agency active

INSERT INTO public.organizations (
  id, name, slug, type,
  subscription_tier, subscription_status, max_users, max_clients,
  stripe_customer_id, stripe_subscription_id, stripe_price_id,
  trial_ends_at, subscription_period_end,
  created_at, updated_at
)
VALUES
  -- 1. Free/Inactive SME: no subscription, sees pricing tiers, can subscribe
  (
    'b1111111-b111-b111-b111-b11111111111',
    'Billing Free SME', 'billing-free-sme', 'SME',
    'free', 'inactive', 1, 0,
    NULL, NULL, NULL,
    NULL, NULL,
    now(), now()
  ),
  -- 2. Solo Trial: 30-day free trial on Solo plan ($29/mo, 1 seat)
  (
    'b2222222-b222-b222-b222-b22222222222',
    'Billing Solo Trial', 'billing-solo-trial', 'SME',
    'solo', 'trial', 1, 0,
    NULL, NULL, NULL,
    now() + interval '30 days', now() + interval '30 days',
    now(), now()
  ),
  -- 3. Solo Active: paid Solo subscriber ($29/mo, 1 seat)
  (
    'b3333333-b333-b333-b333-b33333333333',
    'Billing Solo Active', 'billing-solo-active', 'SME',
    'solo', 'active', 1, 0,
    NULL, NULL, NULL,
    NULL, now() + interval '30 days',
    now(), now()
  ),
  -- 4. Team Trial: 30-day free trial on Team plan ($79/mo, 3 seats)
  (
    'b5555555-b555-b555-b555-b55555555555',
    'Billing Team Trial', 'billing-team-trial', 'SME',
    'team', 'trial', 3, 0,
    NULL, NULL, NULL,
    now() + interval '30 days', now() + interval '30 days',
    now(), now()
  ),
  -- 5. Team Active: paid Team subscriber ($79/mo, 3 seats)
  (
    'b6666666-b666-b666-b666-b66666666666',
    'Billing Team Active', 'billing-team-active', 'SME',
    'team', 'active', 3, 0,
    NULL, NULL, NULL,
    NULL, now() + interval '30 days',
    now(), now()
  ),
  -- 6. Agency Trial: 30-day free trial on Agency plan ($199/mo, 10 seats, 5 clients)
  (
    'b7777777-b777-b777-b777-b77777777777',
    'Billing Agency Trial', 'billing-agency-trial', 'AGENCY',
    'agency', 'trial', 10, 5,
    NULL, NULL, NULL,
    now() + interval '30 days', now() + interval '30 days',
    now(), now()
  ),
  -- 7. Agency Active: paid Agency subscriber ($199/mo, 10 seats, 5 clients)
  (
    'b4444444-b444-b444-b444-b44444444444',
    'Billing Agency Active', 'billing-agency-active', 'AGENCY',
    'agency', 'active', 10, 5,
    NULL, NULL, NULL,
    NULL, now() + interval '30 days',
    now(), now()
  ),
  -- 8. Expired Trial: solo trial that ended 3 days ago — should see upgrade/checkout prompts
  (
    'b8888888-b888-b888-b888-b88888888888',
    'Billing Expired Trial', 'billing-expired-trial', 'SME',
    'solo', 'trial', 1, 0,
    NULL, NULL, NULL,
    now() - interval '3 days', now() - interval '3 days',
    now() - interval '33 days', now()
  ),
  -- 9. Past Due: team subscriber whose payment failed — should see payment update prompts
  (
    'b9999999-b999-b999-b999-b99999999999',
    'Billing Past Due', 'billing-past-due', 'SME',
    'team', 'past_due', 3, 0,
    NULL, NULL, NULL,
    NULL, now() - interval '5 days',
    now() - interval '60 days', now()
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. CREATE TEST USERS IN AUTH.USERS TABLE
-- =============================================================================
-- Password for all test users: "LocalDevOnly123!"

-- The signup trigger (on_auth_user_created) provisions a profile and a fresh
-- organisation for every new auth user. This seed is trusted fixture data that
-- assigns users to specific organisations itself, so it tells the trigger to
-- stand down for the duration of the seed. Without this, each seeded auth user
-- would also spawn a throwaway organisation.
SET app.skip_user_provisioning = 'on';

-- Delete existing test users first (for clean reset)
DELETE FROM auth.users WHERE email LIKE '%@example.com';

-- Insert minimal test users into auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data,
  email_change,
  email_change_token_new,
  email_change_token_current,
  email_change_confirm_status,
  phone_change,
  phone_change_token,
  recovery_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
) VALUES
  -- SME Owner
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'sme.owner@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"SME Owner"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Owner
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'agency.owner@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Owner"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Admin (for smoke tests)
  (
    '45454545-4545-4545-4545-454545454545',
    '00000000-0000-0000-0000-000000000000',
    'agency.admin@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Admin"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- SME Onboarding User (for onboarding tests - NO business context)
  (
    '99999999-9999-9999-9999-999999999999',
    '00000000-0000-0000-0000-000000000000',
    'sme.onboarding@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"SME Onboarding"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Onboarding User (for onboarding tests - NO business context, NO clients)
  (
    '88888888-8888-8888-8888-888888888888',
    '00000000-0000-0000-0000-000000000000',
    'agency.onboarding@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Onboarding"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- =============================================================================
  -- ADDITIONAL SME ROLE USERS (4 more roles)
  -- =============================================================================
  -- SME Marketing Director
  (
    '11111111-1111-1111-1111-111111111112',
    '00000000-0000-0000-0000-000000000000',
    'sme.director@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"SME Marketing Director"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- SME Marketing Manager
  (
    '11111111-1111-1111-1111-111111111113',
    '00000000-0000-0000-0000-000000000000',
    'sme.manager@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"SME Marketing Manager"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- SME Analyst
  (
    '11111111-1111-1111-1111-111111111114',
    '00000000-0000-0000-0000-000000000000',
    'sme.analyst@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"SME Analyst"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- SME Viewer
  (
    '11111111-1111-1111-1111-111111111115',
    '00000000-0000-0000-0000-000000000000',
    'sme.viewer@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"SME Viewer"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- =============================================================================
  -- ADDITIONAL AGENCY ROLE USERS (9 more roles - admin already exists)
  -- =============================================================================
  -- Agency Strategist
  (
    '44444444-4444-4444-4444-444444444446',
    '00000000-0000-0000-0000-000000000000',
    'agency.strategist@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Strategist"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Account Manager (assigned to Test Client Co only)
  (
    '44444444-4444-4444-4444-444444444447',
    '00000000-0000-0000-0000-000000000000',
    'agency.account.manager@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Account Manager"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Campaign Manager
  (
    '44444444-4444-4444-4444-444444444448',
    '00000000-0000-0000-0000-000000000000',
    'agency.campaign.manager@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Campaign Manager"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Analyst
  (
    '44444444-4444-4444-4444-444444444449',
    '00000000-0000-0000-0000-000000000000',
    'agency.analyst@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Analyst"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Creative
  (
    '44444444-4444-4444-4444-44444444444a',
    '00000000-0000-0000-0000-000000000000',
    'agency.creative@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Creative"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Client Viewer (assigned to Test Client Co only)
  (
    '44444444-4444-4444-4444-44444444444b',
    '00000000-0000-0000-0000-000000000000',
    'agency.client.viewer@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Client Viewer"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Freelancer (assigned to Test Startup XYZ only)
  (
    '44444444-4444-4444-4444-44444444444c',
    '00000000-0000-0000-0000-000000000000',
    'agency.freelancer@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Freelancer"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- Agency Viewer
  (
    '44444444-4444-4444-4444-44444444444d',
    '00000000-0000-0000-0000-000000000000',
    'agency.viewer@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Viewer"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- External Client Contact (agency_client role - external user for Test Client Co)
  (
    '44444444-4444-4444-4444-44444444444e',
    '00000000-0000-0000-0000-000000000000',
    'client.contact@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"External Client Contact"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- =============================================================================
  -- BILLING TEST USERS (7 users for subscription flow testing)
  -- Covers: free, solo trial, solo active, team trial, team active, agency trial, agency active
  -- =============================================================================
  -- 1. Free SME (no subscription — sees checkout)
  (
    'b1111111-b111-b111-b111-b11111111111',
    '00000000-0000-0000-0000-000000000000',
    'billing.free@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Billing Free"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- 2. Solo Trial (30-day free trial on Solo $29/mo)
  (
    'b2222222-b222-b222-b222-b22222222222',
    '00000000-0000-0000-0000-000000000000',
    'billing.solo.trial@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Solo Trial User"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- 3. Solo Active (paid Solo $29/mo)
  (
    'b3333333-b333-b333-b333-b33333333333',
    '00000000-0000-0000-0000-000000000000',
    'billing.solo@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Solo Active User"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- 4. Team Trial (30-day free trial on Team $79/mo)
  (
    'b5555555-b555-b555-b555-b55555555555',
    '00000000-0000-0000-0000-000000000000',
    'billing.team.trial@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Team Trial User"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- 5. Team Active (paid Team $79/mo)
  (
    'b6666666-b666-b666-b666-b66666666666',
    '00000000-0000-0000-0000-000000000000',
    'billing.team@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Team Active User"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- 6. Agency Trial (30-day free trial on Agency $199/mo)
  (
    'b7777777-b777-b777-b777-b77777777777',
    '00000000-0000-0000-0000-000000000000',
    'billing.agency.trial@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Trial User"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- 7. Agency Active (paid Agency $199/mo)
  (
    'b4444444-b444-b444-b444-b44444444444',
    '00000000-0000-0000-0000-000000000000',
    'billing.agency@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Agency Active User"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- 8. Expired Trial (solo trial ended 3 days ago)
  (
    'b8888888-b888-b888-b888-b88888888888',
    '00000000-0000-0000-0000-000000000000',
    'billing.expired@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Expired Trial User"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  ),
  -- 9. Past Due (team payment failed 5 days ago)
  (
    'b9999999-b999-b999-b999-b99999999999',
    '00000000-0000-0000-0000-000000000000',
    'billing.pastdue@example.com',
    crypt('LocalDevOnly123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Past Due User"}'::jsonb,
    '',
    '',
    '',
    0,
    '',
    '',
    '',
    '',
    false,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. CREATE PUBLIC.USERS PROFILES
-- =============================================================================

INSERT INTO public.users (id, email, org_id, full_name, created_at, updated_at)
VALUES
  -- SME Users (5 roles)
  ('11111111-1111-1111-1111-111111111111', 'sme.owner@example.com', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', 'SME Owner', now(), now()),
  ('11111111-1111-1111-1111-111111111112', 'sme.director@example.com', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', 'SME Marketing Director', now(), now()),
  ('11111111-1111-1111-1111-111111111113', 'sme.manager@example.com', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', 'SME Marketing Manager', now(), now()),
  ('11111111-1111-1111-1111-111111111114', 'sme.analyst@example.com', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', 'SME Analyst', now(), now()),
  ('11111111-1111-1111-1111-111111111115', 'sme.viewer@example.com', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', 'SME Viewer', now(), now()),
  -- Agency Users (10 roles)
  ('44444444-4444-4444-4444-444444444444', 'agency.owner@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Owner', now(), now()),
  ('45454545-4545-4545-4545-454545454545', 'agency.admin@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Admin', now(), now()),
  ('44444444-4444-4444-4444-444444444446', 'agency.strategist@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Strategist', now(), now()),
  ('44444444-4444-4444-4444-444444444447', 'agency.account.manager@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Account Manager', now(), now()),
  ('44444444-4444-4444-4444-444444444448', 'agency.campaign.manager@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Campaign Manager', now(), now()),
  ('44444444-4444-4444-4444-444444444449', 'agency.analyst@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Analyst', now(), now()),
  ('44444444-4444-4444-4444-44444444444a', 'agency.creative@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Creative', now(), now()),
  ('44444444-4444-4444-4444-44444444444b', 'agency.client.viewer@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Client Viewer', now(), now()),
  ('44444444-4444-4444-4444-44444444444c', 'agency.freelancer@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Freelancer', now(), now()),
  ('44444444-4444-4444-4444-44444444444d', 'agency.viewer@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'Agency Viewer', now(), now()),
  -- Onboarding Users (for testing first-time flows - NO business context)
  ('99999999-9999-9999-9999-999999999999', 'sme.onboarding@example.com', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'SME Onboarding', now(), now()),
  ('88888888-8888-8888-8888-888888888888', 'agency.onboarding@example.com', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Agency Onboarding', now(), now()),
  -- External Client Contact (agency_client role - assigned to Test Client Co)
  ('44444444-4444-4444-4444-44444444444e', 'client.contact@example.com', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', 'External Client Contact', now(), now()),
  -- Billing Test Users (7 users — every tier × trial/active)
  ('b1111111-b111-b111-b111-b11111111111', 'billing.free@example.com', 'b1111111-b111-b111-b111-b11111111111', 'Billing Free', now(), now()),
  ('b2222222-b222-b222-b222-b22222222222', 'billing.solo.trial@example.com', 'b2222222-b222-b222-b222-b22222222222', 'Solo Trial User', now(), now()),
  ('b3333333-b333-b333-b333-b33333333333', 'billing.solo@example.com', 'b3333333-b333-b333-b333-b33333333333', 'Solo Active User', now(), now()),
  ('b5555555-b555-b555-b555-b55555555555', 'billing.team.trial@example.com', 'b5555555-b555-b555-b555-b55555555555', 'Team Trial User', now(), now()),
  ('b6666666-b666-b666-b666-b66666666666', 'billing.team@example.com', 'b6666666-b666-b666-b666-b66666666666', 'Team Active User', now(), now()),
  ('b7777777-b777-b777-b777-b77777777777', 'billing.agency.trial@example.com', 'b7777777-b777-b777-b777-b77777777777', 'Agency Trial User', now(), now()),
  ('b4444444-b444-b444-b444-b44444444444', 'billing.agency@example.com', 'b4444444-b444-b444-b444-b44444444444', 'Agency Active User', now(), now()),
  ('b8888888-b888-b888-b888-b88888888888', 'billing.expired@example.com', 'b8888888-b888-b888-b888-b88888888888', 'Expired Trial User', now(), now()),
  ('b9999999-b999-b999-b999-b99999999999', 'billing.pastdue@example.com', 'b9999999-b999-b999-b999-b99999999999', 'Past Due User', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  org_id = EXCLUDED.org_id,
  full_name = EXCLUDED.full_name;

-- =============================================================================
-- 4. ASSIGN USER ROLES
-- =============================================================================

-- SME Role Assignments (5 roles)
INSERT INTO public.user_role_assignments (user_id, org_id, role_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', (SELECT id FROM roles WHERE name = 'sme_owner'), now()),
  ('11111111-1111-1111-1111-111111111112', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', (SELECT id FROM roles WHERE name = 'sme_marketing_director'), now()),
  ('11111111-1111-1111-1111-111111111113', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', (SELECT id FROM roles WHERE name = 'sme_marketing_manager'), now()),
  ('11111111-1111-1111-1111-111111111114', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', (SELECT id FROM roles WHERE name = 'sme_analyst'), now()),
  ('11111111-1111-1111-1111-111111111115', 'baa7abb7-742d-4d9e-9112-2a095c17f17c', (SELECT id FROM roles WHERE name = 'sme_viewer'), now())
ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;

-- Agency Role Assignments (10 roles) - org-wide access
INSERT INTO public.user_role_assignments (user_id, org_id, role_id, created_at)
VALUES
  ('44444444-4444-4444-4444-444444444444', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_owner'), now()),
  ('45454545-4545-4545-4545-454545454545', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_admin'), now()),
  ('44444444-4444-4444-4444-444444444446', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_strategist'), now()),
  ('44444444-4444-4444-4444-444444444448', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_campaign_manager'), now()),
  ('44444444-4444-4444-4444-444444444449', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_analyst'), now()),
  ('44444444-4444-4444-4444-44444444444a', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_creative'), now()),
  ('44444444-4444-4444-4444-44444444444d', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_viewer'), now())
ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;

-- Onboarding User Role Assignments (owners for clean slate testing)
INSERT INTO public.user_role_assignments (user_id, org_id, role_id, created_at)
VALUES
  ('99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (SELECT id FROM roles WHERE name = 'sme_owner'), now()),
  ('88888888-8888-8888-8888-888888888888', 'cccccccc-cccc-cccc-cccc-cccccccccccc', (SELECT id FROM roles WHERE name = 'agency_owner'), now())
ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;

-- Billing Test User Role Assignments (7 users)
INSERT INTO public.user_role_assignments (user_id, org_id, role_id, created_at)
VALUES
  ('b1111111-b111-b111-b111-b11111111111', 'b1111111-b111-b111-b111-b11111111111', (SELECT id FROM roles WHERE name = 'sme_owner'), now()),
  ('b2222222-b222-b222-b222-b22222222222', 'b2222222-b222-b222-b222-b22222222222', (SELECT id FROM roles WHERE name = 'sme_owner'), now()),
  ('b3333333-b333-b333-b333-b33333333333', 'b3333333-b333-b333-b333-b33333333333', (SELECT id FROM roles WHERE name = 'sme_owner'), now()),
  ('b5555555-b555-b555-b555-b55555555555', 'b5555555-b555-b555-b555-b55555555555', (SELECT id FROM roles WHERE name = 'sme_owner'), now()),
  ('b6666666-b666-b666-b666-b66666666666', 'b6666666-b666-b666-b666-b66666666666', (SELECT id FROM roles WHERE name = 'sme_owner'), now()),
  ('b7777777-b777-b777-b777-b77777777777', 'b7777777-b777-b777-b777-b77777777777', (SELECT id FROM roles WHERE name = 'agency_owner'), now()),
  ('b4444444-b444-b444-b444-b44444444444', 'b4444444-b444-b444-b444-b44444444444', (SELECT id FROM roles WHERE name = 'agency_owner'), now()),
  ('b8888888-b888-b888-b888-b88888888888', 'b8888888-b888-b888-b888-b88888888888', (SELECT id FROM roles WHERE name = 'sme_owner'), now()),
  ('b9999999-b999-b999-b999-b99999999999', 'b9999999-b999-b999-b999-b99999999999', (SELECT id FROM roles WHERE name = 'sme_owner'), now())
ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;

-- =============================================================================
-- 5. ADD BUSINESS CONTEXT (Skip Onboarding Modal for Smoke Tests)
-- =============================================================================
-- NOTE: Only add business context for smoke test orgs, NOT onboarding orgs

INSERT INTO public.core_business_data (
  org_id,
  client_id,
  company_name,
  industry,
  company_size,
  created_at,
  updated_at
)
VALUES
  (
    'baa7abb7-742d-4d9e-9112-2a095c17f17c',
    NULL,
    'Test SME Company',
    'SaaS/Software',
    '1-10 employees',
    now(),
    now()
  ),
  (
    '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff',
    NULL,
    'Test Agency Inc',
    'Professional Services',
    '11-50 employees',
    now(),
    now()
  )
  -- Onboarding orgs (bbbbbbbb... and cccccccc...) intentionally have NO business context
ON CONFLICT (org_id, client_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  industry = EXCLUDED.industry,
  company_size = EXCLUDED.company_size;

-- Business context for billing test orgs (skip onboarding)
INSERT INTO public.core_business_data (
  org_id, client_id, company_name, industry, company_size, created_at, updated_at
)
VALUES
  ('b1111111-b111-b111-b111-b11111111111', NULL, 'FreeUser Co', 'SaaS/Software', '1-10 employees', now(), now()),
  ('b2222222-b222-b222-b222-b22222222222', NULL, 'SoloTrial Co', 'E-commerce', '1-10 employees', now(), now()),
  ('b3333333-b333-b333-b333-b33333333333', NULL, 'SoloActive Co', 'Healthcare', '1-10 employees', now(), now()),
  ('b5555555-b555-b555-b555-b55555555555', NULL, 'TeamTrial Co', 'Financial Services', '1-10 employees', now(), now()),
  ('b6666666-b666-b666-b666-b66666666666', NULL, 'TeamActive Co', 'Real Estate', '11-50 employees', now(), now()),
  ('b7777777-b777-b777-b777-b77777777777', NULL, 'AgencyTrial Partners', 'Professional Services', '11-50 employees', now(), now()),
  ('b4444444-b444-b444-b444-b44444444444', NULL, 'AgencyActive Partners', 'Other', '11-50 employees', now(), now()),
  ('b8888888-b888-b888-b888-b88888888888', NULL, 'ExpiredTrial Co', 'Education', '1-10 employees', now(), now()),
  ('b9999999-b999-b999-b999-b99999999999', NULL, 'PastDue Co', 'Retail', '11-50 employees', now(), now())
ON CONFLICT (org_id, client_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  industry = EXCLUDED.industry,
  company_size = EXCLUDED.company_size;

-- =============================================================================
-- 5a. ADD TEST CLIENT FOR AGENCY (For Agency Critical Path Tests)
-- =============================================================================
-- IMPORTANT: Agency clients must be inserted into agency.clients, NOT public.clients

INSERT INTO agency.clients (
  id,
  org_id,
  name,
  slug,
  industry,
  created_at,
  updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff',
    'Test Client Co',
    'test-client-co',
    'SaaS/Software',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  industry = EXCLUDED.industry;

-- Add business context for test client (stays in public schema for all org types)
INSERT INTO public.core_business_data (
  org_id,
  client_id,
  company_name,
  industry,
  company_size,
  created_at,
  updated_at
)
VALUES
  (
    '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Test Client Co',
    'SaaS/Software',
    '11-50 employees',
    now(),
    now()
  )
ON CONFLICT (org_id, client_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  industry = EXCLUDED.industry,
  company_size = EXCLUDED.company_size;

-- Add 2nd agency client to agency.clients schema
INSERT INTO agency.clients (
  id,
  org_id,
  name,
  slug,
  industry,
  website,
  status,
  created_at
)
VALUES (
  'bbbbbbbb-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff',  -- Test Agency Inc
  'Test Startup XYZ',
  'test-startup-xyz',
  'E-commerce',
  'https://test-startup-xyz.example.com',
  'active',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug;

-- Add test client for billing agency org (b4444444) so integration tests can create sessions
INSERT INTO agency.clients (
  id,
  org_id,
  name,
  slug,
  industry,
  status,
  created_at
)
VALUES (
  'cccccccc-b444-b444-b444-cccccccccccc',
  'b4444444-b444-b444-b444-b44444444444',
  'Billing Test Client',
  'billing-test-client',
  'Technology',
  'active',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug;

-- Add business context for 2nd client
INSERT INTO core_business_data (
  id,
  org_id,
  client_id,
  company_name,
  industry,
  company_size,
  target_market,
  main_products,
  created_at
)
VALUES (
  'bbbbbbbb-b000-b000-b000-bbbbbbbbbbbb',
  '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff',  -- Test Agency Inc
  'bbbbbbbb-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Test Startup XYZ
  'Test Startup XYZ',
  'E-commerce',
  '11-50 employees',
  ARRAY['Young professionals', 'Sustainable fashion consumers'],
  ARRAY['Sustainable fashion marketplace', 'Ethical sourcing platform'],
  now()
)
ON CONFLICT ON CONSTRAINT core_business_data_org_client_key DO UPDATE SET
  company_name = EXCLUDED.company_name;

-- =============================================================================
-- 5b. ASSIGN CLIENT-SPECIFIC ROLES (after clients exist)
-- =============================================================================
-- These roles require client_id to be set - must come after client creation

-- Account Manager: assigned to Test Client Co only
INSERT INTO public.user_role_assignments (user_id, org_id, role_id, client_id, created_at)
VALUES
  ('44444444-4444-4444-4444-444444444447', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_account_manager'), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;

-- Client Viewer: assigned to Test Client Co only
INSERT INTO public.user_role_assignments (user_id, org_id, role_id, client_id, created_at)
VALUES
  ('44444444-4444-4444-4444-44444444444b', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_client_viewer'), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;

-- Freelancer: assigned to Test Startup XYZ only
INSERT INTO public.user_role_assignments (user_id, org_id, role_id, client_id, created_at)
VALUES
  ('44444444-4444-4444-4444-44444444444c', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_freelancer'), 'bbbbbbbb-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;

-- External Client Contact: agency_client role assigned to Test Client Co
-- This is an EXTERNAL user who logs into the Client Portal to review/approve work
INSERT INTO public.user_role_assignments (user_id, org_id, role_id, client_id, created_at)
VALUES
  ('44444444-4444-4444-4444-44444444444e', '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff', (SELECT id FROM roles WHERE name = 'agency_client'), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;

-- SME sample campaigns (2 campaigns)
INSERT INTO campaigns (
  id,
  org_id,
  name,
  status,
  description,
  campaign_type,
  start_date,
  end_date,
  budget_cents,
  created_at
)
VALUES
  (
    'cccccccc-0001-0001-0001-000000000001',
    'baa7abb7-742d-4d9e-9112-2a095c17f17c',  -- Test SME Company
    'Q1 2025 Product Launch',
    'active',
    'Major product launch campaign targeting enterprise customers',
    'Product Launch',
    '2025-01-01',
    '2025-03-31',
    5000000,  -- $50,000
    now()
  ),
  (
    'cccccccc-0001-0001-0001-000000000002',
    'baa7abb7-742d-4d9e-9112-2a095c17f17c',  -- Test SME Company
    'Content Marketing Initiative',
    'active',
    'Ongoing content marketing to establish thought leadership',
    'Content Marketing',
    '2025-01-15',
    '2025-06-30',
    2500000,  -- $25,000
    now()
  )
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Agency sample campaigns (2 campaigns, 1 per client)
-- NOTE: Agency orgs use agency.campaigns schema, not public.campaigns
INSERT INTO agency.campaigns (
  id,
  org_id,
  client_id,
  name,
  status,
  description,
  campaign_type,
  start_date,
  end_date,
  budget_cents,
  created_at
)
VALUES
  (
    'dddddddd-0001-0001-0001-000000000001',
    '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff',  -- Test Agency Inc
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Test Client Co
    'SaaS Growth Campaign Q1 2025',
    'active',
    'Multi-channel growth campaign for Test Client Co SaaS product',
    'Growth Marketing',
    '2025-01-01',
    '2025-03-31',
    3000000,  -- $30,000
    now()
  ),
  (
    'dddddddd-0001-0001-0001-000000000002',
    '70038b0e-a1f8-4ed2-9bc8-40b94ee41cff',  -- Test Agency Inc
    'bbbbbbbb-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Test Startup XYZ
    'E-commerce Brand Launch',
    'active',
    'Brand awareness and customer acquisition for Test Startup XYZ',
    'Brand Launch',
    '2025-02-01',
    '2025-05-31',
    2000000,  -- $20,000
    now()
  )
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- =============================================================================
-- 6. REFRESH MATERIALIZED VIEWS
-- =============================================================================

REFRESH MATERIALIZED VIEW org_metrics_cache;
REFRESH MATERIALIZED VIEW user_roles_cache;

-- Refresh approved outputs library (added Dec 2025)
-- Note: Uses CONCURRENTLY which requires unique index (created in migration 301)
REFRESH MATERIALIZED VIEW approved_outputs_library;

-- =============================================================================
-- 7. SEED COMPLETE - OUTPUT SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'COMPREHENSIVE SEED DATA LOADED';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Test Organizations: 13';
  RAISE NOTICE '  - Test SME Company (SME) - WITH business context';
  RAISE NOTICE '  - Test SME Onboarding Org (SME) - NO business context';
  RAISE NOTICE '  - Test Agency Inc (Agency) - WITH business context';
  RAISE NOTICE '  - Test Agency Onboarding Org (Agency) - NO business context';
  RAISE NOTICE '  - Billing Free SME - free/inactive';
  RAISE NOTICE '  - Billing Solo Trial - solo/trial (30 days)';
  RAISE NOTICE '  - Billing Solo Active - solo/active (paid $29/mo)';
  RAISE NOTICE '  - Billing Team Trial - team/trial (30 days)';
  RAISE NOTICE '  - Billing Team Active - team/active (paid $79/mo)';
  RAISE NOTICE '  - Billing Agency Trial - agency/trial (30 days)';
  RAISE NOTICE '  - Billing Agency Active - agency/active (paid $199/mo)';
  RAISE NOTICE '  - Billing Expired Trial - solo/trial (expired 3 days ago)';
  RAISE NOTICE '  - Billing Past Due - team/past_due (payment failed)';
  RAISE NOTICE '';
  RAISE NOTICE 'Password for ALL users: LocalDevOnly123!';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'SME USERS (5 roles) - Test SME Company';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  sme.owner@example.com        → sme_owner';
  RAISE NOTICE '  sme.director@example.com     → sme_marketing_director';
  RAISE NOTICE '  sme.manager@example.com      → sme_marketing_manager';
  RAISE NOTICE '  sme.analyst@example.com      → sme_analyst';
  RAISE NOTICE '  sme.viewer@example.com       → sme_viewer';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'AGENCY USERS (11 roles) - Test Agency Inc';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  agency.owner@example.com           → agency_owner (all clients)';
  RAISE NOTICE '  agency.admin@example.com           → agency_admin (all clients)';
  RAISE NOTICE '  agency.strategist@example.com      → agency_strategist (all clients)';
  RAISE NOTICE '  agency.account.manager@example.com → agency_account_manager (Test Client Co only)';
  RAISE NOTICE '  agency.campaign.manager@example.com→ agency_campaign_manager (all clients)';
  RAISE NOTICE '  agency.analyst@example.com         → agency_analyst (all clients)';
  RAISE NOTICE '  agency.creative@example.com        → agency_creative (all clients)';
  RAISE NOTICE '  agency.client.viewer@example.com   → agency_client_viewer (Test Client Co only)';
  RAISE NOTICE '  agency.freelancer@example.com      → agency_freelancer (Test Startup XYZ only)';
  RAISE NOTICE '  agency.viewer@example.com          → agency_viewer (all clients)';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'BILLING TEST USERS (every tier × trial/active)';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  billing.free@example.com          → sme_owner    (free/inactive — sees checkout)';
  RAISE NOTICE '  billing.solo.trial@example.com    → sme_owner    (solo/trial — 30 day trial $29)';
  RAISE NOTICE '  billing.solo@example.com          → sme_owner    (solo/active — paid $29/mo)';
  RAISE NOTICE '  billing.team.trial@example.com    → sme_owner    (team/trial — 30 day trial $79)';
  RAISE NOTICE '  billing.team@example.com          → sme_owner    (team/active — paid $79/mo)';
  RAISE NOTICE '  billing.agency.trial@example.com  → agency_owner (agency/trial — 30 day trial $199)';
  RAISE NOTICE '  billing.agency@example.com        → agency_owner (agency/active — paid $199/mo)';
  RAISE NOTICE '  billing.expired@example.com       → sme_owner    (solo/trial — EXPIRED 3 days ago)';
  RAISE NOTICE '  billing.pastdue@example.com       → sme_owner    (team/past_due — payment failed)';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'EXTERNAL CLIENT USER (Client Portal)';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  client.contact@example.com   → agency_client (Test Client Co only)';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'ONBOARDING TEST USERS (NO business context)';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  sme.onboarding@example.com    → sme_owner (blank slate)';
  RAISE NOTICE '  agency.onboarding@example.com → agency_owner (blank slate)';
  RAISE NOTICE '';
  RAISE NOTICE 'Total: 27 test users covering all 16 roles + 2 onboarding + 9 billing';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Cleaning up auto-created Default Organizations...';

  DELETE FROM user_role_assignments
  WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111113',
    '11111111-1111-1111-1111-111111111114',
    '11111111-1111-1111-1111-111111111115',
    '44444444-4444-4444-4444-444444444444',
    '45454545-4545-4545-4545-454545454545',
    '44444444-4444-4444-4444-444444444446',
    '44444444-4444-4444-4444-444444444447',
    '44444444-4444-4444-4444-444444444448',
    '44444444-4444-4444-4444-444444444449',
    '44444444-4444-4444-4444-44444444444a',
    '44444444-4444-4444-4444-44444444444b',
    '44444444-4444-4444-4444-44444444444c',
    '44444444-4444-4444-4444-44444444444d',
    '44444444-4444-4444-4444-44444444444e',
    '99999999-9999-9999-9999-999999999999',
    '88888888-8888-8888-8888-888888888888',
    'b1111111-b111-b111-b111-b11111111111',
    'b2222222-b222-b222-b222-b22222222222',
    'b3333333-b333-b333-b333-b33333333333',
    'b4444444-b444-b444-b444-b44444444444',
    'b5555555-b555-b555-b555-b55555555555',
    'b6666666-b666-b666-b666-b66666666666',
    'b7777777-b777-b777-b777-b77777777777',
    'b8888888-b888-b888-b888-b88888888888',
    'b9999999-b999-b999-b999-b99999999999'
  )
  AND org_id IN (
    SELECT id FROM organizations
    WHERE name = 'Default Organization'
      AND type = 'SME'
  );

  RAISE NOTICE 'Cleanup complete - all users have single org assignment';
  RAISE NOTICE '';
END $$;

-- Re-enable signup provisioning for anything that runs after the seed.
RESET app.skip_user_provisioning;
