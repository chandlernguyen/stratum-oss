-- ============================================================================
-- harden_tenant_isolation
-- Least-privilege grants and safe signup provisioning.
-- ============================================================================
--
-- The dumped schema inherited Supabase's permissive defaults: anon and
-- authenticated held table-level UPDATE on the tenant tables, and anon could
-- execute every function in `public`. Because the publishable anon key ships in
-- the browser bundle, and a client-side `.eq('org_id', ...)` filter is not a
-- boundary, that combination allowed:
--
--   * tenant-hopping  - any authenticated user rewriting their own users.org_id;
--   * entitlement self-service - rewriting organizations.subscription_*;
--   * minting and moving accounts with the public key alone.
--
-- RLS cannot close a column-privilege gap, so the grants are tightened here.

-- 1. Signup provisioning -----------------------------------------------------
-- The schema shipped handle_new_user but never created its trigger, so a
-- self-signed-up user got no profile at all. It also honoured client-supplied
-- raw_user_meta_data for both org_id and role, which is a cross-tenant write
-- primitive. This replacement ignores both: a signup always provisions a fresh
-- organisation and the default owner role for its type. The
-- app.skip_user_provisioning setting is read only by supabase/seed.sql, which
-- loads trusted fixtures that assign their own organisations.
--
-- Defined before section 3 so the deny-by-default revoke also covers it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  v_role_id uuid;
  user_role text;
  base_slug text;
  final_slug text;
  slug_counter integer := 0;
BEGIN
  IF current_setting('app.skip_user_provisioning', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.raw_user_meta_data->>'organization_type' = 'AGENCY' THEN
    user_role := 'agency_owner';
  ELSE
    user_role := 'sme_owner';
  END IF;

  base_slug := COALESCE(
    NEW.raw_user_meta_data->>'organization_slug',
    lower(replace(COALESCE(NEW.raw_user_meta_data->>'organization_name', 'default-org'), ' ', '-'))
  );
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    slug_counter := slug_counter + 1;
    final_slug := base_slug || '-' || slug_counter;
  END LOOP;

  INSERT INTO public.organizations (name, type, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.raw_user_meta_data->>'company_name', 'Default Organization'),
    COALESCE(NEW.raw_user_meta_data->>'organization_type', 'SME'),
    final_slug
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, email, full_name, org_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    new_org_id,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  SELECT id INTO v_role_id FROM public.roles WHERE name = user_role LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.user_role_assignments (user_id, org_id, role_id, created_at)
    VALUES (NEW.id, new_org_id, v_role_id, now())
    ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tenant tables -----------------------------------------------------------
-- Browser roles read only what RLS exposes. The only column writes the web app
-- performs are profile fields and locale (see
-- apps/web/src/hooks/data/useUserProfile.ts and useLocale.ts).
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.organizations FROM anon, authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT SELECT ON TABLE public.organizations TO authenticated;
GRANT UPDATE (full_name, phone, avatar_url, preferences, locale, updated_at)
  ON TABLE public.users TO authenticated;

-- 3. Functions: deny by default ----------------------------------------------
-- PostgreSQL grants EXECUTE to PUBLIC on every function by default and anon
-- inherits it, so revoking from anon alone is a no-op. Revoke the PUBLIC grant,
-- then restore the two roles PostgREST actually serves. The browser makes no
-- pre-login RPC call, so anon needs no function at all.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Server-only helpers must not be reachable even with a stolen user token.
REVOKE EXECUTE ON FUNCTION public.create_auth_user_direct(uuid, text, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_user_to_organization(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_user_onboarding(uuid, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_roles_cached(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_user_mfa_enrolled(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_record(text, uuid, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_test_budget_alert(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_test_budget_alert(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_test_organizations() FROM anon, authenticated;

-- 4. Default privileges ------------------------------------------------------
-- Objects created by the schema owner must not be granted to anon by default.
-- (supabase_admin's own defaults govern Supabase infrastructure objects and can
-- only be changed by that role, which migrations do not run as.)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
