-- ============================================================================
-- retire_superseded_objects
-- Final cleanup of objects the dump supersedes (e.g. a retired trigger function). Runs last so earlier grants and triggers still resolve.
-- ============================================================================



-- Superseded by the shared function above.
DROP FUNCTION IF EXISTS "public"."refresh_user_roles_cache_for_role_permissions"();