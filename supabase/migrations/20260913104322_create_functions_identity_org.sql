-- ============================================================================
-- create_functions_identity_org
-- Functions for users, organisations, roles, invitations, onboarding and MFA.
-- ============================================================================





CREATE OR REPLACE FUNCTION "public"."assign_clients_to_user"("p_target_user_id" "uuid", "p_client_ids" "uuid"[], "p_all_clients" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user_id UUID;
  v_org_id UUID;
  v_target_org_id UUID;
  v_role_id UUID;
  v_client_id UUID;
  v_assigned_count INTEGER := 0;
  v_valid_client_ids UUID[];
BEGIN
  v_current_user_id := auth.uid();

  -- Get current user's org_id
  SELECT org_id INTO v_org_id
  FROM users
  WHERE id = v_current_user_id;

  -- Get target user's org_id and role_id
  SELECT u.org_id, ura.role_id
  INTO v_target_org_id, v_role_id
  FROM users u
  LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
  WHERE u.id = p_target_user_id
  LIMIT 1;

  IF v_target_org_id IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Verify same org
  IF v_org_id != v_target_org_id THEN
    RAISE EXCEPTION 'Cannot modify user from different organization';
  END IF;

  -- Verify current user has permission to manage users
  IF NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN role_permissions rp ON ura.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ura.user_id = v_current_user_id
      AND ura.org_id = v_org_id
      AND p.name = 'users.manage'
  ) THEN
    RAISE EXCEPTION 'Permission denied: users.manage required';
  END IF;

  -- Remove existing client assignments for this user (keeping the role)
  DELETE FROM user_role_assignments
  WHERE user_id = p_target_user_id
    AND org_id = v_org_id;

  IF p_all_clients OR array_length(p_client_ids, 1) IS NULL OR array_length(p_client_ids, 1) = 0 THEN
    -- Insert single row with NULL client_id (org-level access)
    INSERT INTO user_role_assignments (user_id, org_id, role_id, client_id, assigned_by, created_at)
    VALUES (p_target_user_id, v_org_id, v_role_id, NULL, v_current_user_id, NOW());
    v_assigned_count := 0; -- 0 means "all clients"
  ELSE
    -- Validate that all client_ids belong to this org
    SELECT ARRAY_AGG(id) INTO v_valid_client_ids
    FROM clients
    WHERE id = ANY(p_client_ids)
      AND org_id = v_org_id
      AND archived_at IS NULL;

    IF v_valid_client_ids IS NULL OR array_length(v_valid_client_ids, 1) = 0 THEN
      RAISE EXCEPTION 'No valid clients found in the provided list';
    END IF;

    -- Insert one row per client
    FOREACH v_client_id IN ARRAY v_valid_client_ids
    LOOP
      INSERT INTO user_role_assignments (user_id, org_id, role_id, client_id, assigned_by, created_at)
      VALUES (p_target_user_id, v_org_id, v_role_id, v_client_id, v_current_user_id, NOW())
      ON CONFLICT (user_id, org_id, role_id, client_id) DO NOTHING;
      v_assigned_count := v_assigned_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', p_target_user_id,
    'assigned_count', v_assigned_count,
    'all_clients', p_all_clients OR array_length(p_client_ids, 1) IS NULL OR array_length(p_client_ids, 1) = 0
  );
END;
$$;


ALTER FUNCTION "public"."assign_clients_to_user"("p_target_user_id" "uuid", "p_client_ids" "uuid"[], "p_all_clients" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assign_clients_to_user"("p_target_user_id" "uuid", "p_client_ids" "uuid"[], "p_all_clients" boolean) IS 'Assign specific clients to a user, or grant org-wide access (all clients).
Parameters:
  - p_target_user_id: The user to modify
  - p_client_ids: Array of client IDs to assign (empty or NULL for all clients)
  - p_all_clients: If TRUE, grants org-wide access regardless of client_ids';



CREATE OR REPLACE FUNCTION "public"."assign_user_to_organization"("user_id" "uuid", "org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result JSONB;
BEGIN
    -- Update user's organization
    UPDATE public.users
    SET org_id = assign_user_to_organization.org_id,
        updated_at = now()
    WHERE id = assign_user_to_organization.user_id;

    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'user_id', user_id,
            'org_id', org_id,
            'message', 'User assigned to organization successfully'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'user_id', user_id,
            'org_id', org_id,
            'error', 'User not found in public.users table'
        );
    END IF;

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object(
        'success', false,
        'user_id', user_id,
        'org_id', org_id,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."assign_user_to_organization"("user_id" "uuid", "org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assign_user_to_organization"("user_id" "uuid", "org_id" "uuid") IS 'Assign user to specific organization for test setup';


CREATE OR REPLACE FUNCTION "public"."check_onboarding_status"("p_user_id" "uuid") RETURNS TABLE("needs_onboarding" boolean, "org_type" "text", "org_id" "uuid", "org_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Single query to check onboarding status
  -- Returns true if user is SME AND has no business context data
  RETURN QUERY
  SELECT
    (o.type = 'SME' AND NOT EXISTS(
      SELECT 1 FROM core_business_data cbd
      WHERE cbd.org_id = u.org_id
      AND cbd.archived_at IS NULL  -- Only check non-archived data
    )) as needs_onboarding,
    o.type as org_type,
    u.org_id,
    o.name as org_name
  FROM users u
  JOIN organizations o ON o.id = u.org_id
  WHERE u.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."check_onboarding_status"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_onboarding_status"("p_user_id" "uuid") IS 'Version: 1.0 - Checks if user needs onboarding. Returns true for SME users without business context. Agency users always return false (no onboarding required).';



CREATE OR REPLACE FUNCTION "public"."check_user_exists"("user_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_id UUID;
    result JSONB;
BEGIN
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;

    IF user_id IS NOT NULL THEN
        result := jsonb_build_object('exists', true, 'user_id', user_id);
    ELSE
        result := jsonb_build_object('exists', false, 'user_id', null);
    END IF;

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object('exists', false, 'error', SQLERRM);
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."check_user_exists"("user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_user_exists"("user_email" "text") IS 'Check if user exists with organization info';



CREATE OR REPLACE FUNCTION "public"."check_user_mfa_enrolled"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
DECLARE
    v_factor_count INTEGER;
BEGIN
    -- Count verified MFA factors for the user
    SELECT COUNT(*)
    INTO v_factor_count
    FROM auth.mfa_factors
    WHERE user_id = p_user_id
    AND status = 'verified';

    -- Return true if user has at least one verified factor
    RETURN v_factor_count > 0;
END;
$$;


ALTER FUNCTION "public"."check_user_mfa_enrolled"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_user_mfa_enrolled"("p_user_id" "uuid") IS 'Returns true if user has at least one verified MFA factor. Used for AAL2 enforcement.';


CREATE OR REPLACE FUNCTION "public"."complete_user_onboarding"("p_user_id" "uuid", "p_invitation_token" "text", "p_full_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_invitation RECORD;
  v_org_name TEXT;
  v_role_name TEXT;
  v_result JSONB;
BEGIN
  -- Get and validate invitation
  SELECT * INTO v_invitation
  FROM team_invitations
  WHERE invitation_token = p_invitation_token
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already used invitation token';
  END IF;

  -- Check expiration
  IF v_invitation.expires_at < NOW() THEN
    UPDATE team_invitations
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  -- Create user profile in users table
  INSERT INTO users (
    id, email, org_id, full_name
  ) VALUES (
    p_user_id, v_invitation.email, v_invitation.org_id, p_full_name
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    org_id = EXCLUDED.org_id,
    full_name = EXCLUDED.full_name;

  -- Assign role to user
  INSERT INTO user_role_assignments (
    user_id, org_id, role_id, client_id
  ) VALUES (
    p_user_id, v_invitation.org_id, v_invitation.role_id, v_invitation.client_id
  );

  -- Mark invitation as accepted
  UPDATE team_invitations
  SET
    status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Get org and role info for response
  SELECT o.name, r.name
  INTO v_org_name, v_role_name
  FROM organizations o, roles r
  WHERE o.id = v_invitation.org_id
    AND r.id = v_invitation.role_id;

  -- Build result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'email', v_invitation.email,
    'org_id', v_invitation.org_id,
    'org_name', v_org_name,
    'role_id', v_invitation.role_id,
    'role_name', v_role_name,
    'client_id', v_invitation.client_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically for unhandled exceptions
    RAISE;
END;
$$;


ALTER FUNCTION "public"."complete_user_onboarding"("p_user_id" "uuid", "p_invitation_token" "text", "p_full_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_user_onboarding"("p_user_id" "uuid", "p_invitation_token" "text", "p_full_name" "text") IS 'Database-first: Atomic user onboarding after Supabase Auth signup. All-or-nothing transaction.';


CREATE OR REPLACE FUNCTION "public"."create_auth_user_direct"("user_id" "uuid", "user_email" "text", "user_password" "text", "user_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result JSONB;
BEGIN
    -- Insert directly into auth.users table
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
        email_change,
        email_change_token_new,
        email_change_token_current,
        phone_change,
        phone_change_token,
        recovery_token,
        reauthentication_token,
        raw_app_meta_data,
        raw_user_meta_data
    ) VALUES (
        user_id,
        '00000000-0000-0000-0000-000000000000',
        user_email,
        crypt(user_password, gen_salt('bf')),
        now(),
        now(),
        now(),
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '{"provider":"email","providers":["email"]}'::JSONB,
        user_metadata
    );

    -- The handle_new_user trigger should automatically create the public.users profile
    -- Return success status
    result := jsonb_build_object('success', true, 'user_id', user_id, 'email', user_email);

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    -- Return error details
    result := jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."create_auth_user_direct"("user_id" "uuid", "user_email" "text", "user_password" "text", "user_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_auth_user_direct"("user_id" "uuid", "user_email" "text", "user_password" "text", "user_metadata" "jsonb") IS 'Direct auth user creation function for test data setup - bypasses Supabase Admin API';


CREATE OR REPLACE FUNCTION "public"."create_team_invitation"("p_org_id" "uuid", "p_email" "text", "p_role_id" "uuid", "p_invited_by" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_invitation_token TEXT;
  v_expires_at TIMESTAMP;
  v_invitation_id UUID;
  v_user_role TEXT;
  v_role_name TEXT;
  v_invited_role_name TEXT;
  v_result JSONB;
  v_current_members INT;
  v_pending_invitations INT;
  v_max_users INT;
BEGIN
  -- Validate inviter has permission (owner/admin only)
  SELECT r.name INTO v_user_role
  FROM user_role_assignments ura
  INNER JOIN roles r ON ura.role_id = r.id
  WHERE ura.user_id = p_invited_by
    AND ura.org_id = p_org_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found in organization';
  END IF;

  IF v_user_role NOT IN ('agency_owner', 'agency_admin', 'sme_owner', 'sme_marketing_director') THEN
    RAISE EXCEPTION 'Permission denied: Only owners and admins can invite team members';
  END IF;

  -- Validate role exists and get the role name
  SELECT name INTO v_invited_role_name
  FROM roles
  WHERE id = p_role_id;

  IF v_invited_role_name IS NULL THEN
    RAISE EXCEPTION 'Role not found';
  END IF;

  -- ==========================================================================
  -- Role Hierarchy Enforcement
  -- ==========================================================================
  IF v_invited_role_name IN ('agency_owner', 'sme_owner') THEN
    IF v_user_role NOT IN ('agency_owner', 'sme_owner') THEN
      RAISE EXCEPTION 'Permission denied: Only owners can invite users with owner role';
    END IF;
  END IF;

  IF v_invited_role_name IN ('agency_admin') THEN
    IF v_user_role NOT IN ('agency_owner', 'sme_owner') THEN
      RAISE EXCEPTION 'Permission denied: Only owners can invite users with admin role';
    END IF;
  END IF;

  IF v_user_role IN ('sme_marketing_director') THEN
    IF v_invited_role_name IN ('sme_owner', 'sme_marketing_director') THEN
      RAISE EXCEPTION 'Permission denied: Directors cannot invite users with owner or director roles';
    END IF;
  END IF;

  -- ==========================================================================
  -- Seat Limit Enforcement
  -- ==========================================================================
  SELECT COUNT(*) INTO v_current_members
  FROM users
  WHERE org_id = p_org_id;

  SELECT COUNT(*) INTO v_pending_invitations
  FROM team_invitations
  WHERE org_id = p_org_id
    AND status = 'pending';

  SELECT COALESCE(max_users, 1) INTO v_max_users
  FROM organizations
  WHERE id = p_org_id;

  IF (v_current_members + v_pending_invitations) >= v_max_users THEN
    RAISE EXCEPTION 'Seat limit reached (% of % seats used, % pending invitations). Upgrade your plan to add more team members.',
      v_current_members, v_max_users, v_pending_invitations;
  END IF;

  -- Check for existing pending invitation
  IF EXISTS (
    SELECT 1 FROM team_invitations
    WHERE org_id = p_org_id
      AND LOWER(email) = LOWER(p_email)
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending invitation already exists for %', p_email;
  END IF;

  -- Check if user already exists in org
  IF EXISTS (
    SELECT 1 FROM users
    WHERE org_id = p_org_id AND LOWER(email) = LOWER(p_email)
  ) THEN
    RAISE EXCEPTION 'User % is already a member of this organization', p_email;
  END IF;

  -- Generate secure token (base64 encoded 24 random bytes = 32 chars)
  v_invitation_token := encode(extensions.gen_random_bytes(24), 'base64');
  v_expires_at := NOW() + INTERVAL '7 days';

  -- Create invitation record
  INSERT INTO team_invitations (
    org_id, email, role_id, invited_by, invitation_token,
    client_id, status, expires_at
  ) VALUES (
    p_org_id, LOWER(p_email), p_role_id, p_invited_by,
    v_invitation_token, p_client_id, 'pending', v_expires_at
  ) RETURNING id INTO v_invitation_id;

  -- Return invitation details (token included for email sending)
  v_result := jsonb_build_object(
    'invitation_id', v_invitation_id,
    'email', LOWER(p_email),
    'role_id', p_role_id,
    'role_name', v_invited_role_name,
    'invitation_token', v_invitation_token,
    'expires_at', v_expires_at,
    'created_at', NOW()
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_team_invitation"("p_org_id" "uuid", "p_email" "text", "p_role_id" "uuid", "p_invited_by" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_team_invitation"("p_org_id" "uuid", "p_email" "text", "p_role_id" "uuid", "p_invited_by" "uuid", "p_client_id" "uuid") IS 'Database-first: Validates permissions, role hierarchy, and seat limits before creating invitation.';



CREATE OR REPLACE FUNCTION "public"."expire_old_invitations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update expired invitations
  UPDATE team_invitations
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$;


ALTER FUNCTION "public"."expire_old_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_approved_outputs_for_user"("p_agent_type" "text" DEFAULT NULL::"text", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "client_id" "uuid", "agent_type" "text", "output_type" "text", "title" "text", "summary" "text", "content" "jsonb", "version" integer, "approval_status" "text", "approved_at" timestamp with time zone, "approved_by" "uuid", "approved_by_name" "text", "campaign_id" "uuid", "confidence_score" double precision, "impact_score" integer, "category" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "schema_source" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_org_id UUID;
BEGIN
  -- Get the current user's org_id
  SELECT u.org_id INTO v_user_org_id
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_user_org_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    aol.id,
    aol.org_id,
    aol.client_id,
    aol.agent_type,
    aol.output_type,
    aol.title,
    aol.summary,
    aol.content,
    aol.version,
    aol.approval_status,
    aol.approved_at,
    aol.approved_by,
    aol.approved_by_name,
    aol.campaign_id,
    aol.confidence_score,
    aol.impact_score,
    aol.category,
    aol.created_at,
    aol.updated_at,
    aol.schema_source
  FROM approved_outputs_library aol
  WHERE aol.org_id = v_user_org_id
    AND (p_agent_type IS NULL OR aol.agent_type = p_agent_type)
    AND (p_client_id IS NULL OR aol.client_id = p_client_id)
  ORDER BY aol.approved_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_approved_outputs_for_user"("p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_assignable_team_members"("p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_org_type TEXT;
    v_members JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user's organization and type
    -- Note: organizations.type column (not organization_type)
    SELECT u.org_id, o.type
    INTO v_org_id, v_org_type
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    WHERE u.id = v_user_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'User organization not found';
    END IF;

    -- For SME organizations: return all team members in the org
    -- For Agency organizations:
    --   - If p_client_id provided: return members who have access to that client
    --   - If no p_client_id: return all team members in the org (let UI handle filtering)
    IF v_org_type = 'AGENCY' AND p_client_id IS NOT NULL THEN
        -- Agency with client filter: Get members who have access to this client
        SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.full_name), '[]'::jsonb)
        INTO v_members
        FROM (
            SELECT DISTINCT
                u.id,
                u.full_name,
                u.email,
                r.name AS role_name
            FROM users u
            LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
            LEFT JOIN roles r ON ura.role_id = r.id
            WHERE u.org_id = v_org_id
            AND u.archived_at IS NULL
            AND (
                -- Org-wide roles (not client-scoped)
                r.name NOT IN ('agency_account_manager', 'agency_freelancer', 'agency_client_viewer')
                OR
                -- Client-scoped roles with access to this specific client
                (r.name IN ('agency_account_manager', 'agency_freelancer', 'agency_client_viewer')
                 AND ura.client_id = p_client_id)
            )
        ) t;
    ELSE
        -- SME or Agency without client filter: return all org members
        SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.full_name), '[]'::jsonb)
        INTO v_members
        FROM (
            SELECT
                u.id,
                u.full_name,
                u.email,
                r.name AS role_name
            FROM users u
            LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
            LEFT JOIN roles r ON ura.role_id = r.id
            WHERE u.org_id = v_org_id
            AND u.archived_at IS NULL
        ) t;
    END IF;

    RETURN jsonb_build_object('members', v_members);
END;
$$;


ALTER FUNCTION "public"."get_assignable_team_members"("p_client_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_current_user"() RETURNS TABLE("user_id" "uuid", "org_id" "uuid", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.uid() as user_id,
    u.org_id,
    COALESCE(
      (SELECT r.name
       FROM user_role_assignments ura
       JOIN roles r ON ura.role_id = r.id
       WHERE ura.user_id = auth.uid() AND ura.org_id = u.org_id
       ORDER BY ura.created_at DESC
       LIMIT 1),
      'sme_viewer'
    )::TEXT as role
  FROM users u
  WHERE u.id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_current_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_with_org"() RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "role" "text", "org_id" "uuid", "org_name" "text", "org_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email,
    u.full_name,
    COALESCE(
      (SELECT r.name
       FROM user_role_assignments ura
       JOIN roles r ON ura.role_id = r.id
       WHERE ura.user_id = u.id AND ura.org_id = u.org_id
       ORDER BY ura.created_at DESC
       LIMIT 1),
      'sme_viewer'
    )::TEXT as role,
    u.org_id,
    o.name as org_name,
    o.type as org_type
  FROM users u
  LEFT JOIN organizations o ON o.id = u.org_id
  WHERE u.id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_current_user_with_org"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_organization_intelligence"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_personas', (SELECT COUNT(*) FROM synthetic_personas WHERE org_id = p_org_id AND archived_at IS NULL),
        'total_strategies', (SELECT COUNT(*) FROM marketing_strategies WHERE org_id = p_org_id),
        'active_strategies', (SELECT COUNT(*) FROM marketing_strategies WHERE org_id = p_org_id AND status = 'active'),
        'total_insights', (SELECT COUNT(*) FROM ai_insights WHERE org_id = p_org_id),
        'validated_insights', (SELECT COUNT(*) FROM ai_insights WHERE org_id = p_org_id AND validation_status = 'approved'),
        'intelligence_sources', (
            SELECT jsonb_object_agg(agent_type, count)
            FROM (
                SELECT agent_type, COUNT(*) as count
                FROM agent_outputs
                WHERE org_id = p_org_id AND archived_at IS NULL
                GROUP BY agent_type
            ) intelligence_counts
        ),
        'last_updated', NOW()
    ) INTO v_result;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_organization_intelligence"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organization_intelligence"("p_org_id" "uuid") IS 'Get organization intelligence summary from agent_outputs table (nuclear migration). Updated in migration 092 to use agent_outputs instead of individual intelligence tables.';


CREATE OR REPLACE FUNCTION "public"."get_team_members_with_invitations"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'members', (
      SELECT COALESCE(jsonb_agg(member_with_clients ORDER BY joined_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          u.id as user_id,
          u.email,
          u.full_name,
          (SELECT ura2.role_id FROM user_role_assignments ura2 WHERE ura2.user_id = u.id AND ura2.org_id = p_org_id LIMIT 1) as role_id,
          (SELECT r.name FROM user_role_assignments ura2 JOIN roles r ON ura2.role_id = r.id WHERE ura2.user_id = u.id AND ura2.org_id = p_org_id LIMIT 1) as role_name,
          u.created_at as joined_at,
          NULL::timestamp as last_active,
          -- New: Check if user has org-level access (NULL client_id)
          EXISTS (
            SELECT 1 FROM user_role_assignments ura3
            WHERE ura3.user_id = u.id
              AND ura3.org_id = p_org_id
              AND ura3.client_id IS NULL
          ) as is_all_clients,
          -- New: Count of assigned clients (0 if all_clients)
          (
            SELECT COUNT(*)::INTEGER
            FROM user_role_assignments ura3
            WHERE ura3.user_id = u.id
              AND ura3.org_id = p_org_id
              AND ura3.client_id IS NOT NULL
          ) as client_count,
          -- New: Array of assigned client names (for tooltip)
          (
            SELECT COALESCE(ARRAY_AGG(c.name ORDER BY c.name), ARRAY[]::TEXT[])
            FROM user_role_assignments ura3
            JOIN clients c ON ura3.client_id = c.id
            WHERE ura3.user_id = u.id
              AND ura3.org_id = p_org_id
              AND ura3.client_id IS NOT NULL
              AND c.archived_at IS NULL
          ) as client_names,
          -- New: Array of assigned client IDs (for edit modal)
          (
            SELECT COALESCE(ARRAY_AGG(ura3.client_id), ARRAY[]::UUID[])
            FROM user_role_assignments ura3
            WHERE ura3.user_id = u.id
              AND ura3.org_id = p_org_id
              AND ura3.client_id IS NOT NULL
          ) as client_ids
        FROM users u
        WHERE u.org_id = p_org_id
          AND u.archived_at IS NULL
        GROUP BY u.id, u.email, u.full_name, u.created_at
      ) member_with_clients
    ),
    'pending_invitations', (
      SELECT COALESCE(jsonb_agg(inv_data ORDER BY created_at DESC), '[]'::jsonb)
      FROM (
        SELECT
          ti.id,
          ti.org_id,
          ti.email,
          ti.role_id,
          r.name as role_name,
          ti.invited_by,
          inviter.full_name as inviter_name,
          ti.client_id,
          c.name as client_name,
          ti.status,
          ti.invitation_token,
          ti.expires_at,
          ti.accepted_at,
          ti.created_at,
          ti.updated_at
        FROM team_invitations ti
        INNER JOIN roles r ON ti.role_id = r.id
        LEFT JOIN users inviter ON ti.invited_by = inviter.id
        LEFT JOIN clients c ON ti.client_id = c.id
        WHERE ti.org_id = p_org_id
          AND ti.status = 'pending'
          AND ti.expires_at > NOW()
      ) inv_data
    ),
    'total_members', (
      SELECT COUNT(DISTINCT u.id)
      FROM users u
      WHERE u.org_id = p_org_id
        AND u.archived_at IS NULL
    ),
    'total_pending', (
      SELECT COUNT(*)
      FROM team_invitations ti
      WHERE ti.org_id = p_org_id
        AND ti.status = 'pending'
        AND ti.expires_at > NOW()
    )
  ) INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_team_members_with_invitations"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_team_members_with_invitations"("p_org_id" "uuid") IS 'Get team members and pending invitations for an organization.
Now includes client assignment info: is_all_clients, client_count, client_names, client_ids.';



CREATE OR REPLACE FUNCTION "public"."get_test_organizations"() RETURNS TABLE("id" "uuid", "name" "text", "type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.name, o.type::TEXT
    FROM organizations o
    WHERE o.name LIKE '%Test%'
    AND o.archived_at IS NULL
    ORDER BY o.created_at;
END;
$$;


ALTER FUNCTION "public"."get_test_organizations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_test_organizations"() IS 'Get all test organizations for setup scripts';


CREATE OR REPLACE FUNCTION "public"."get_user_client_assignments"("p_target_user_id" "uuid") RETURNS TABLE("client_id" "uuid", "client_name" "text", "client_slug" "text", "assigned_at" timestamp with time zone, "is_all_clients" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id UUID;
  v_has_org_level_access BOOLEAN;
BEGIN
  -- Get org_id for target user
  SELECT u.org_id INTO v_org_id
  FROM users u
  WHERE u.id = p_target_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if user has org-level access (NULL client_id means all clients)
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    WHERE ura.user_id = p_target_user_id
      AND ura.org_id = v_org_id
      AND ura.client_id IS NULL
  ) INTO v_has_org_level_access;

  IF v_has_org_level_access THEN
    -- Return all clients with is_all_clients = TRUE
    RETURN QUERY
    SELECT
      c.id AS client_id,
      c.name AS client_name,
      c.slug AS client_slug,
      NULL::TIMESTAMPTZ AS assigned_at,
      TRUE AS is_all_clients
    FROM clients c
    WHERE c.org_id = v_org_id
      AND c.archived_at IS NULL
    ORDER BY c.name;
  ELSE
    -- Return only assigned clients
    RETURN QUERY
    SELECT
      c.id AS client_id,
      c.name AS client_name,
      c.slug AS client_slug,
      ura.created_at AS assigned_at,
      FALSE AS is_all_clients
    FROM user_role_assignments ura
    JOIN clients c ON ura.client_id = c.id
    WHERE ura.user_id = p_target_user_id
      AND ura.org_id = v_org_id
      AND c.archived_at IS NULL
    ORDER BY c.name;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_client_assignments"("p_target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_client_assignments"("p_target_user_id" "uuid") IS 'Get client assignments for a user. Returns all clients if user has org-level access,
or only assigned clients if restricted. The is_all_clients flag indicates which mode.';



CREATE OR REPLACE FUNCTION "public"."get_user_context"("p_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "created_at" timestamp with time zone, "org_id" "uuid", "org_name" "text", "org_type" "text", "org_settings" "jsonb", "roles" "jsonb", "permissions" "text"[], "client_access" "jsonb", "can_manage_clients" boolean, "can_view_clients" boolean, "can_create_campaigns" boolean, "can_manage_users" boolean, "can_view_analytics" boolean, "context_generated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_permissions TEXT[];
  user_roles_json JSONB;
  client_access_json JSONB;
BEGIN
  -- Get user permissions and roles from cache
  SELECT
    array_agg(DISTINCT perm) as all_permissions,
    json_agg(DISTINCT jsonb_build_object(
      'role_name', urc.role_name,
      'client_id', urc.client_id,
      'client_name', urc.client_name,
      'is_org_role', urc.is_org_role
    )) as roles_json,
    json_agg(DISTINCT
      CASE
        WHEN urc.client_id IS NOT NULL
        THEN jsonb_build_object('id', urc.client_id, 'name', urc.client_name)
        ELSE NULL
      END
    ) FILTER (WHERE urc.client_id IS NOT NULL) as clients_json
  INTO user_permissions, user_roles_json, client_access_json
  FROM user_roles_cache urc,
       unnest(urc.permissions) as perm
  WHERE urc.user_id = p_user_id;

  -- Return complete user context
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email::TEXT,
    u.created_at,
    o.id as org_id,
    o.name::TEXT as org_name,
    o.type::TEXT as org_type,
    o.settings as org_settings,
    COALESCE(user_roles_json, '[]'::jsonb) as roles,
    COALESCE(user_permissions, ARRAY[]::TEXT[]) as permissions,
    COALESCE(client_access_json, '[]'::jsonb) as client_access,
    -- Computed permissions
    (user_permissions && ARRAY['clients.client.manage']) as can_manage_clients,
    (user_permissions && ARRAY['clients.client.read', 'clients.client.manage']) as can_view_clients,
    (user_permissions && ARRAY['campaigns.campaign.create']) as can_create_campaigns,
    (user_permissions && ARRAY['users.manage']) as can_manage_users,
    (user_permissions && ARRAY['analytics.view_basic', 'analytics.view_advanced']) as can_view_analytics,
    now() as context_generated_at
  FROM users u
  JOIN organizations o ON u.org_id = o.id
  WHERE u.id = p_user_id
    AND u.archived_at IS NULL
    AND o.archived_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_user_context"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_context"("p_user_id" "uuid") IS 'Returns complete user context including organization, roles, permissions, and client access.
Optimized single-call replacement for multiple frontend queries. Version: 1.0';



CREATE OR REPLACE FUNCTION "public"."get_user_org_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id
  FROM users
  WHERE id = auth.uid();

  RETURN v_org_id;
END;
$$;


ALTER FUNCTION "public"."get_user_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_roles"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("role_name" "text", "permissions" "text"[], "client_id" "uuid", "client_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.name::TEXT as role_name,
    array_agg(DISTINCT p.name ORDER BY p.name)::TEXT[] as permissions,
    ura.client_id,
    c.name::TEXT as client_name
  FROM user_role_assignments ura
  JOIN roles r ON ura.role_id = r.id
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN permissions p ON rp.permission_id = p.id
  LEFT JOIN clients c ON ura.client_id = c.id
  WHERE ura.user_id = p_user_id
    AND ura.org_id = p_org_id
  GROUP BY r.name, ura.client_id, c.name
  ORDER BY r.name, c.name;
END;
$$;


ALTER FUNCTION "public"."get_user_roles"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid", "p_org_id" "uuid") IS 'Returns user roles and permissions for given user and organization with client context.
Replaces multiple frontend table joins with single optimized database call.
Version: 1.0';



CREATE OR REPLACE FUNCTION "public"."get_user_roles_cached"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("role_name" "text", "permissions" "text"[], "client_id" "uuid", "client_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    urc.role_name::TEXT,
    urc.permissions::TEXT[],
    urc.client_id,
    urc.client_name::TEXT
  FROM user_roles_cache urc
  WHERE urc.user_id = p_user_id
    AND urc.org_id = p_org_id
  ORDER BY urc.role_name, urc.client_name;
END;
$$;


ALTER FUNCTION "public"."get_user_roles_cached"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_roles_cached"("p_user_id" "uuid", "p_org_id" "uuid") IS 'Cache-optimized user roles lookup using materialized view.
Provides sub-millisecond response times for user permissions.
Version: 1.1';


CREATE OR REPLACE FUNCTION "public"."has_pending_invitation_request"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM invitation_requests
    WHERE lower(email) = lower(p_email)
    AND status = 'pending'
  );
$$;


ALTER FUNCTION "public"."has_pending_invitation_request"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_org_metrics_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  affected_org_id UUID;
  notification_data JSONB;
BEGIN
  -- Determine affected org from trigger context
  -- organizations table uses 'id', other tables use 'org_id'
  IF TG_TABLE_NAME = 'organizations' THEN
    IF TG_OP = 'DELETE' THEN
      affected_org_id := OLD.id;
    ELSE
      affected_org_id := NEW.id;
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      affected_org_id := OLD.org_id;
    ELSE
      affected_org_id := NEW.org_id;
    END IF;
  END IF;

  -- Refresh materialized view concurrently (non-blocking)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY org_metrics_cache;
  EXCEPTION WHEN OTHERS THEN
    -- If concurrent refresh fails, do regular refresh
    REFRESH MATERIALIZED VIEW org_metrics_cache;
  END;

  -- Build notification data
  notification_data := json_build_object(
    'org_id', affected_org_id,
    'operation', TG_OP,
    'timestamp', extract(epoch from now()),
    'table', TG_TABLE_NAME,
    'trigger', TG_NAME
  );

  -- Notify frontend via Supabase Realtime
  PERFORM pg_notify('org_metrics_updated', notification_data::text);

  -- Also notify specific organization channel
  PERFORM pg_notify('org_metrics_' || affected_org_id::text, notification_data::text);

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."refresh_org_metrics_cache"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_org_metrics_cache"() IS 'Refreshes organization metrics cache and notifies frontend via pg_notify.
Triggered automatically on campaign, client, or user changes.';



CREATE OR REPLACE FUNCTION "public"."refresh_user_roles_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  affected_user_id UUID;
  affected_org_id UUID;
BEGIN
  -- Determine affected user and org from trigger context
  IF TG_OP = 'DELETE' THEN
    affected_user_id := OLD.user_id;
    affected_org_id := OLD.org_id;
  ELSE
    affected_user_id := NEW.user_id;
    affected_org_id := NEW.org_id;
  END IF;

  -- Refresh materialized view concurrently (non-blocking)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_roles_cache;
  EXCEPTION WHEN OTHERS THEN
    -- If concurrent refresh fails, do regular refresh
    REFRESH MATERIALIZED VIEW user_roles_cache;
  END;

  -- Notify frontend via Supabase Realtime
  PERFORM pg_notify('user_roles_updated', json_build_object(
    'user_id', affected_user_id,
    'org_id', affected_org_id,
    'operation', TG_OP,
    'timestamp', extract(epoch from now()),
    'table', TG_TABLE_NAME
  )::text);

  -- Also notify specific user channel
  PERFORM pg_notify('user_roles_' || affected_user_id::text, json_build_object(
    'org_id', affected_org_id,
    'operation', TG_OP,
    'timestamp', extract(epoch from now())
  )::text);

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."refresh_user_roles_cache"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_user_roles_cache"() IS 'Refreshes user roles cache and notifies frontend via pg_notify.
Triggered automatically on role assignment changes.';



CREATE OR REPLACE FUNCTION "public"."refresh_user_roles_cache_for_role_permissions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- When role_permissions change, we need to refresh the cache for ALL users
  -- with that role, since we can't identify specific users from role_permissions table

  -- Refresh materialized view concurrently (non-blocking)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_roles_cache;
  EXCEPTION WHEN OTHERS THEN
    -- If concurrent refresh fails, do regular refresh
    REFRESH MATERIALIZED VIEW user_roles_cache;
  END;

  -- Notify frontend via Supabase Realtime (generic notification)
  PERFORM pg_notify('user_roles_updated', json_build_object(
    'operation', TG_OP,
    'timestamp', extract(epoch from now()),
    'table', TG_TABLE_NAME,
    'message', 'Role permissions updated - all users affected'
  )::text);

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."refresh_user_roles_cache_for_role_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_user_roles_cache_for_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- When roles change, we need to refresh the entire cache
  -- since we can't identify specific users from roles table

  -- Refresh materialized view concurrently (non-blocking)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_roles_cache;
  EXCEPTION WHEN OTHERS THEN
    -- If concurrent refresh fails, do regular refresh
    REFRESH MATERIALIZED VIEW user_roles_cache;
  END;

  -- Notify frontend via Supabase Realtime (generic notification)
  PERFORM pg_notify('user_roles_updated', json_build_object(
    'operation', TG_OP,
    'timestamp', extract(epoch from now()),
    'table', TG_TABLE_NAME,
    'message', 'Roles updated - cache refreshed'
  )::text);

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."refresh_user_roles_cache_for_roles"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."remove_team_member"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_role_name TEXT;
  v_target_role_name TEXT;
  v_target_email TEXT;
  v_target_full_name TEXT;
  v_owner_count INTEGER;
BEGIN
  -- Get caller's role
  SELECT r.name INTO v_caller_role_name
  FROM user_role_assignments ura
  INNER JOIN roles r ON ura.role_id = r.id
  WHERE ura.user_id = COALESCE(auth.uid(), p_user_id) AND ura.org_id = p_org_id
  LIMIT 1;

  -- Validate caller has permission
  IF v_caller_role_name IS NULL THEN
    RAISE EXCEPTION 'User not found in organization';
  END IF;

  IF v_caller_role_name NOT IN ('sme_owner', 'agency_owner', 'agency_admin') THEN
    RAISE EXCEPTION 'Permission denied: Only owners and admins can remove team members';
  END IF;

  -- Prevent self-removal
  IF COALESCE(auth.uid(), p_user_id) = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot remove yourself from the organization';
  END IF;

  -- Get target user info
  SELECT r.name, u.email, u.full_name INTO v_target_role_name, v_target_email, v_target_full_name
  FROM user_role_assignments ura
  INNER JOIN roles r ON ura.role_id = r.id
  INNER JOIN users u ON ura.user_id = u.id
  WHERE ura.user_id = p_target_user_id AND ura.org_id = p_org_id
  LIMIT 1;

  -- Validate target user exists in org
  IF v_target_role_name IS NULL THEN
    RAISE EXCEPTION 'Target user not found in organization';
  END IF;

  -- Agency admins cannot remove agency owners
  IF v_caller_role_name = 'agency_admin' AND v_target_role_name = 'agency_owner' THEN
    RAISE EXCEPTION 'Agency admins cannot remove agency owners';
  END IF;

  -- Check if removing last owner (for both SME and Agency)
  IF v_target_role_name IN ('sme_owner', 'agency_owner') THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM user_role_assignments ura
    INNER JOIN roles r ON ura.role_id = r.id
    WHERE ura.org_id = p_org_id
      AND r.name = v_target_role_name
      AND ura.user_id != p_target_user_id;

    IF v_owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last owner. Assign another owner first.';
    END IF;
  END IF;

  -- Soft delete: Set archived_at timestamp
  UPDATE users
  SET archived_at = NOW()
  WHERE id = p_target_user_id AND org_id = p_org_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Successfully removed %s (%s) from the organization', v_target_full_name, v_target_email)
  );
END;
$$;


ALTER FUNCTION "public"."remove_team_member"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_team_member"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_org_id" "uuid") IS 'Remove team member from organization (soft delete). Validates permissions, prevents self-removal and removing last owner.';



CREATE OR REPLACE FUNCTION "public"."revoke_team_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id UUID;
  v_user_role TEXT;
  v_invitation_status TEXT;
  v_invitation_org_id UUID;
BEGIN
  -- Get user's org and role
  SELECT u.org_id, r.name
  INTO v_org_id, v_user_role
  FROM users u
  INNER JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.org_id = u.org_id
  INNER JOIN roles r ON ura.role_id = r.id
  WHERE u.id = p_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check permission
  IF v_user_role NOT IN ('agency_owner', 'agency_admin', 'sme_owner', 'sme_marketing_director') THEN
    RAISE EXCEPTION 'Permission denied: Only owners and admins can revoke invitations';
  END IF;

  -- Get invitation details
  SELECT status, org_id
  INTO v_invitation_status, v_invitation_org_id
  FROM team_invitations
  WHERE id = p_invitation_id;

  IF v_invitation_status IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Verify invitation belongs to user's org
  IF v_invitation_org_id != v_org_id THEN
    RAISE EXCEPTION 'Cannot revoke invitation from another organization';
  END IF;

  -- Check if invitation can be revoked
  IF v_invitation_status != 'pending' THEN
    RAISE EXCEPTION 'Cannot revoke invitation with status: %', v_invitation_status;
  END IF;

  -- Revoke the invitation
  UPDATE team_invitations
  SET
    status = 'revoked',
    updated_at = NOW()
  WHERE id = p_invitation_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Invitation revoked successfully',
    'invitation_id', p_invitation_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."revoke_team_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."revoke_team_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") IS 'Database-first: Revokes pending invitation with permission check and org isolation.';


CREATE OR REPLACE FUNCTION "public"."trigger_refresh_approval_cache_on_user_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only refresh if full_name changed
  IF TG_OP = 'UPDATE' AND OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    PERFORM refresh_approval_requests_cache();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_refresh_approval_cache_on_user_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invitation_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invitation_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_team_member_role"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_new_role_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_role_name TEXT;
  v_target_current_role_name TEXT;
  v_new_role_name TEXT;
  v_target_user_email TEXT;
  v_role_assignments_count INTEGER;
BEGIN
  -- Get caller's role
  SELECT r.name INTO v_caller_role_name
  FROM user_role_assignments ura
  INNER JOIN roles r ON ura.role_id = r.id
  WHERE ura.user_id = COALESCE(auth.uid(), p_user_id) AND ura.org_id = p_org_id
  LIMIT 1;

  -- Validate caller has permission
  IF v_caller_role_name IS NULL THEN
    RAISE EXCEPTION 'User not found in organization';
  END IF;

  IF v_caller_role_name NOT IN ('agency_owner', 'agency_admin') THEN
    RAISE EXCEPTION 'Permission denied: Only agency owners and admins can change member roles';
  END IF;

  -- Get target user's current role and email
  SELECT r.name, u.email INTO v_target_current_role_name, v_target_user_email
  FROM user_role_assignments ura
  INNER JOIN roles r ON ura.role_id = r.id
  INNER JOIN users u ON ura.user_id = u.id
  WHERE ura.user_id = p_target_user_id AND ura.org_id = p_org_id
  LIMIT 1;

  -- Validate target user exists in org
  IF v_target_current_role_name IS NULL THEN
    RAISE EXCEPTION 'Target user not found in organization';
  END IF;

  -- Get new role name and validate it exists
  SELECT name INTO v_new_role_name
  FROM roles
  WHERE id = p_new_role_id;

  IF v_new_role_name IS NULL THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  -- Prevent self-demotion check: if changing own role to non-owner/admin
  IF COALESCE(auth.uid(), p_user_id) = p_target_user_id THEN
    IF v_caller_role_name IN ('agency_owner', 'agency_admin') AND
       v_new_role_name NOT IN ('agency_owner', 'agency_admin') THEN
      RAISE EXCEPTION 'Cannot downgrade your own role from owner/admin';
    END IF;
  END IF;

  -- Agency admins cannot change agency owners
  IF v_caller_role_name = 'agency_admin' AND v_target_current_role_name = 'agency_owner' THEN
    RAISE EXCEPTION 'Agency admins cannot change agency owner roles';
  END IF;

  -- Update role in user_role_assignments
  UPDATE user_role_assignments
  SET
    role_id = p_new_role_id,
    assigned_by = COALESCE(auth.uid(), p_user_id)
  WHERE user_id = p_target_user_id
    AND org_id = p_org_id;

  GET DIAGNOSTICS v_role_assignments_count = ROW_COUNT;

  IF v_role_assignments_count = 0 THEN
    RAISE EXCEPTION 'Failed to update role assignment';
  END IF;

  -- Role cache will auto-refresh via trigger

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'email', v_target_user_email,
    'new_role_name', v_new_role_name,
    'previous_role_name', v_target_current_role_name,
    'message', format('Role updated from %s to %s', v_target_current_role_name, v_new_role_name)
  );
END;
$$;


ALTER FUNCTION "public"."update_team_member_role"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_new_role_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_team_member_role"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_new_role_id" "uuid", "p_org_id" "uuid") IS 'Change team member role with permission validation. Only owners/admins can change roles. Prevents self-demotion and unauthorized changes.';


CREATE OR REPLACE FUNCTION "public"."update_user_feedback_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_feedback_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_feedback_updated_at"() IS 'Trigger function to update updated_at timestamp. Uses SET search_path for security.';



CREATE OR REPLACE FUNCTION "public"."user_has_client_access"("p_client_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Use subquery pattern for performance (evaluated once, not per-row)
  v_user_id := (SELECT auth.uid());

  -- Get user's org_id
  SELECT org_id INTO v_org_id
  FROM users
  WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has access
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    WHERE ura.user_id = v_user_id
      AND ura.org_id = v_org_id
      AND (
        ura.client_id IS NULL
        OR ura.client_id = p_client_id
      )
  );
END;
$$;


ALTER FUNCTION "public"."user_has_client_access"("p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_client_access"("p_client_id" "uuid") IS 'Check if the current user has access to a specific client.
Returns TRUE if user has org-level access (all clients) or specific client assignment.
Used in RLS policies for client-scoped tables.';



CREATE OR REPLACE FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_org_id" "uuid", "p_permission_name" "text", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN role_permissions rp ON ura.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ura.user_id = p_user_id
        AND ura.org_id = p_org_id
        AND p.name = p_permission_name
        AND (p_client_id IS NULL OR ura.client_id = p_client_id OR ura.client_id IS NULL)
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$;


ALTER FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_org_id" "uuid", "p_permission_name" "text", "p_client_id" "uuid") OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- 7. Fix: statement-level cache refresh for global reference tables
--
-- public.refresh_user_roles_cache() derives the affected user from
-- NEW.user_id / OLD.user_id. That is correct for user_role_assignments, but it
-- was ALSO attached row-level to public.permissions — a table with no user_id
-- column — so every INSERT into permissions failed with:
--
--     record "new" has no field "user_id" (SQLSTATE 42703)
--
-- The defect was masked in the original migration chain, which inserted the
-- RBAC reference data before this trigger existed.
--
-- permissions and role_permissions are global reference data: a change affects
-- every user's effective roles, so there is no single user to notify. Both now
-- share one statement-level refresh function, which also removes the previous
-- near-duplicate implementation.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."refresh_user_roles_cache_for_global_change"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SET "search_path" TO 'public'
AS $$
BEGIN
    -- Refresh the cache. CONCURRENTLY cannot run inside a transaction block,
    -- which a trigger always is, so fall back to a blocking refresh.
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY user_roles_cache;
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW user_roles_cache;
    END;

    -- Generic broadcast: the whole cache changed, not one user's roles.
    PERFORM pg_notify('user_roles_updated', json_build_object(
        'operation', TG_OP,
        'timestamp', extract(epoch from now()),
        'table', TG_TABLE_NAME,
        'message', 'Global role/permission change - all users affected'
    )::text);

    RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. Security: pin search_path on refresh_org_metrics_cache
--
-- Supabase advisor `function_search_path_mutable`: the function had no
-- search_path, so unqualified references (it calls
-- REFRESH MATERIALIZED VIEW org_metrics_cache) resolve against a caller-mutable
-- path. Pinning matches the convention used by every other function in this
-- schema.
-- ---------------------------------------------------------------------------

ALTER FUNCTION "public"."refresh_org_metrics_cache"() SET search_path = 'public';