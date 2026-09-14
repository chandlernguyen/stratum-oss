-- ============================================================================
-- create_functions_collaboration_notifications
-- Functions for comments, tasks, feedback and notifications.
-- ============================================================================





CREATE OR REPLACE FUNCTION "public"."acknowledge_alert"("p_alert_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  alert_org_id UUID;
  user_org_id UUID;
BEGIN
  -- Get alert's org_id
  SELECT org_id INTO alert_org_id
  FROM campaign_alerts
  WHERE id = p_alert_id;

  -- Get user's org_id
  SELECT org_id INTO user_org_id
  FROM users
  WHERE id = p_user_id;

  -- Check if user belongs to the same organization
  IF alert_org_id != user_org_id THEN
    RETURN FALSE;
  END IF;

  -- Acknowledge the alert
  UPDATE campaign_alerts
  SET
    acknowledged = TRUE,
    acknowledged_by = p_user_id,
    acknowledged_at = now(),
    updated_at = now()
  WHERE id = p_alert_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."acknowledge_alert"("p_alert_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."create_comment"("p_resource_type" "text", "p_resource_id" "uuid", "p_content" "text", "p_parent_id" "uuid" DEFAULT NULL::"uuid", "p_mentioned_users" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_result resource_comments;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT org_id INTO v_org_id FROM users WHERE id = v_user_id;

    INSERT INTO resource_comments (
        org_id, resource_type, resource_id, author_id, content, parent_id, mentioned_users
    ) VALUES (
        v_org_id, p_resource_type, p_resource_id, v_user_id, p_content, p_parent_id, COALESCE(p_mentioned_users, '{}')
    )
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;


ALTER FUNCTION "public"."create_comment"("p_resource_type" "text", "p_resource_id" "uuid", "p_content" "text", "p_parent_id" "uuid", "p_mentioned_users" "uuid"[]) OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."create_task"("p_title" "text", "p_assigned_to" "uuid", "p_task_type" "text" DEFAULT 'general'::"text", "p_description" "text" DEFAULT NULL::"text", "p_priority" "text" DEFAULT 'normal'::"text", "p_due_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_related_resource_type" "text" DEFAULT NULL::"text", "p_related_resource_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_result task_assignments;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT org_id INTO v_org_id FROM users WHERE id = v_user_id;

    INSERT INTO task_assignments (
        org_id, client_id, title, description, task_type, status, priority,
        assigned_by, assigned_to, due_date, related_resource_type, related_resource_id
    ) VALUES (
        v_org_id, p_client_id, p_title, p_description, p_task_type, 'todo', p_priority,
        v_user_id, p_assigned_to, p_due_date, p_related_resource_type, p_related_resource_id
    )
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;


ALTER FUNCTION "public"."create_task"("p_title" "text", "p_assigned_to" "uuid", "p_task_type" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone, "p_client_id" "uuid", "p_related_resource_type" "text", "p_related_resource_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."delete_comment"("p_comment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_deleted_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    DELETE FROM resource_comments
    WHERE id = p_comment_id
    AND org_id = v_org_id
    AND author_id = v_user_id
    RETURNING id INTO v_deleted_id;

    IF v_deleted_id IS NULL THEN
        RAISE EXCEPTION 'Comment not found or not authorized';
    END IF;

    RETURN jsonb_build_object('deleted', TRUE, 'id', v_deleted_id);
END;
$$;


ALTER FUNCTION "public"."delete_comment"("p_comment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_tasks_count"() RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM task_assignments
    WHERE assigned_to = v_user_id AND status IN ('todo', 'in_progress');

    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."get_pending_tasks_count"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_task"("p_task_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    SELECT row_to_json(t)::jsonb INTO v_result
    FROM (
        SELECT
            ta.id, ta.org_id, ta.client_id, ta.title, ta.description, ta.task_type,
            ta.status, ta.priority, ta.assigned_by, ta.assigned_to, ta.due_date,
            ta.related_resource_type, ta.related_resource_id, ta.created_at,
            ta.updated_at, ta.completed_at,
            ab.full_name AS assigned_by_name,
            at.full_name AS assigned_to_name
        FROM task_assignments ta
        LEFT JOIN users ab ON ta.assigned_by = ab.id
        LEFT JOIN users at ON ta.assigned_to = at.id
        WHERE ta.id = p_task_id AND ta.org_id = v_org_id
    ) t;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_task"("p_task_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_unacknowledged_alerts"("p_org_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "alert_type" "text", "severity" "text", "title" "text", "message" "text", "data" "jsonb", "created_at" timestamp with time zone, "campaign_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.id,
    ca.alert_type,
    ca.severity,
    ca.title,
    ca.message,
    ca.data,
    ca.created_at,
    c.name as campaign_name
  FROM campaign_alerts ca
  LEFT JOIN campaigns c ON ca.campaign_id = c.id
  WHERE ca.org_id = p_org_id
    AND ca.acknowledged = FALSE
    AND (ca.expires_at IS NULL OR ca.expires_at > now())
  ORDER BY
    CASE ca.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    ca.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_unacknowledged_alerts"("p_org_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"() RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE user_id = v_user_id AND is_read = FALSE;

    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_comments"("p_resource_type" "text", "p_resource_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_comments JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at ASC), '[]'::jsonb)
    INTO v_comments
    FROM (
        SELECT
            rc.id, rc.org_id, rc.resource_type, rc.resource_id,
            rc.parent_id, rc.author_id, rc.content, rc.is_resolved,
            rc.resolved_by, rc.resolved_at, rc.mentioned_users,
            rc.created_at, rc.updated_at,
            u.full_name AS author_name,
            u.email AS author_email
        FROM resource_comments rc
        LEFT JOIN users u ON rc.author_id = u.id
        WHERE rc.resource_type = p_resource_type
        AND rc.resource_id = p_resource_id
        AND rc.org_id = v_org_id
    ) t;

    RETURN jsonb_build_object('comments', v_comments);
END;
$$;


ALTER FUNCTION "public"."list_comments"("p_resource_type" "text", "p_resource_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_notifications"("p_unread_only" boolean DEFAULT false, "p_limit" integer DEFAULT 50) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_notifications JSONB;
    v_unread_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO v_notifications
    FROM (
        SELECT
            n.id, n.user_id, n.type, n.title, n.body, n.resource_type,
            n.resource_id, n.action_url, n.is_read, n.created_at, n.read_at
        FROM notifications n
        WHERE n.user_id = v_user_id
        AND (NOT p_unread_only OR n.is_read = FALSE)
        ORDER BY n.created_at DESC
        LIMIT p_limit
    ) t;

    SELECT COUNT(*) INTO v_unread_count
    FROM notifications
    WHERE user_id = v_user_id AND is_read = FALSE;

    RETURN jsonb_build_object(
        'notifications', v_notifications,
        'unread_count', v_unread_count
    );
END;
$$;


ALTER FUNCTION "public"."list_notifications"("p_unread_only" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_tasks"("p_status" "text" DEFAULT NULL::"text", "p_assigned_to_me" boolean DEFAULT false, "p_assigned_by_me" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_tasks JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY
        CASE t.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
        END,
        t.due_date NULLS LAST,
        t.created_at DESC
    ), '[]'::jsonb)
    INTO v_tasks
    FROM (
        SELECT
            ta.id, ta.org_id, ta.client_id, ta.title, ta.description, ta.task_type,
            ta.status, ta.priority, ta.assigned_by, ta.assigned_to, ta.due_date,
            ta.related_resource_type, ta.related_resource_id, ta.created_at,
            ta.updated_at, ta.completed_at,
            ab.full_name AS assigned_by_name,
            at.full_name AS assigned_to_name
        FROM task_assignments ta
        LEFT JOIN users ab ON ta.assigned_by = ab.id
        LEFT JOIN users at ON ta.assigned_to = at.id
        WHERE ta.org_id = v_org_id
        AND (p_status IS NULL OR ta.status = p_status)
        AND (NOT p_assigned_to_me OR ta.assigned_to = v_user_id)
        AND (NOT p_assigned_by_me OR ta.assigned_by = v_user_id)
    ) t;

    RETURN jsonb_build_object('tasks', v_tasks);
END;
$$;


ALTER FUNCTION "public"."list_tasks"("p_status" "text", "p_assigned_to_me" boolean, "p_assigned_by_me" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = v_user_id
    AND is_read = FALSE;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object('marked_read', v_count);
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_feedback_fixed"("p_feedback_id" "uuid", "p_commit_sha" "text", "p_resolution_notes" "text" DEFAULT NULL::"text", "p_fixed_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update the feedback item
  UPDATE user_feedback
  SET
    status = 'fixed',
    fixed_in_commit = p_commit_sha,
    fixed_at = now(),
    fixed_by = COALESCE(p_fixed_by, auth.uid()),
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    updated_at = now()
  WHERE id = p_feedback_id
  RETURNING jsonb_build_object(
    'id', id,
    'status', status,
    'fixed_at', fixed_at,
    'fixed_in_commit', fixed_in_commit
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Feedback item not found: %', p_feedback_id;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."mark_feedback_fixed"("p_feedback_id" "uuid", "p_commit_sha" "text", "p_resolution_notes" "text", "p_fixed_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_feedback_fixed"("p_feedback_id" "uuid", "p_commit_sha" "text", "p_resolution_notes" "text", "p_fixed_by" "uuid") IS 'Mark a feedback item as fixed and record the commit SHA. Uses SECURITY DEFINER with SET search_path for security.';



CREATE OR REPLACE FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = ANY(p_notification_ids)
    AND user_id = v_user_id
    AND is_read = FALSE;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object('marked_read', v_count);
END;
$$;


ALTER FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_comment_mention"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_mentioned_user UUID;
BEGIN
    IF NEW.mentioned_users IS NOT NULL AND array_length(NEW.mentioned_users, 1) > 0 THEN
        FOREACH v_mentioned_user IN ARRAY NEW.mentioned_users
        LOOP
            INSERT INTO notifications (user_id, type, title, body, resource_type, resource_id, action_url)
            VALUES (
                v_mentioned_user,
                'mention',
                'You were mentioned',
                'You were mentioned in a comment',
                NEW.resource_type,
                NEW.resource_id,
                '/' || NEW.resource_type || 's/' || NEW.resource_id::text
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_comment_mention"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_task_assigned"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, body, resource_type, resource_id, action_url)
    VALUES (
        NEW.assigned_to,
        'task_assigned',
        'New task assigned',
        'You have been assigned a new task: ' || NEW.title,
        'task',
        NEW.id,
        '/tasks'
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_task_assigned"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_task_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'done' THEN
        INSERT INTO notifications (user_id, type, title, body, resource_type, resource_id, action_url)
        VALUES (
            NEW.assigned_by,
            'task_completed',
            'Task completed',
            'Task "' || NEW.title || '" has been completed',
            'task',
            NEW.id,
            '/tasks'
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_task_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_push_device"("p_device_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_deleted_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM public.push_devices
    WHERE user_id = v_user_id
      AND device_token = btrim(p_device_token);

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'removed', v_deleted_count > 0,
        'deleted_count', v_deleted_count
    );
END;
$$;


ALTER FUNCTION "public"."remove_push_device"("p_device_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_push_device"("p_device_token" "text") IS 'Removes the current authenticated user''s push device token registration.';



CREATE OR REPLACE FUNCTION "public"."update_comment"("p_comment_id" "uuid", "p_content" "text" DEFAULT NULL::"text", "p_is_resolved" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_result resource_comments;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    UPDATE resource_comments
    SET
        content = COALESCE(p_content, content),
        is_resolved = COALESCE(p_is_resolved, is_resolved),
        resolved_by = CASE WHEN p_is_resolved = TRUE THEN v_user_id ELSE resolved_by END,
        resolved_at = CASE WHEN p_is_resolved = TRUE THEN NOW() ELSE resolved_at END,
        updated_at = NOW()
    WHERE id = p_comment_id
    AND org_id = v_org_id
    AND (author_id = v_user_id OR p_content IS NULL)
    RETURNING * INTO v_result;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Comment not found or not authorized';
    END IF;

    RETURN to_jsonb(v_result);
END;
$$;


ALTER FUNCTION "public"."update_comment"("p_comment_id" "uuid", "p_content" "text", "p_is_resolved" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_feedback_status"("p_feedback_id" "uuid", "p_status" "text", "p_priority" "text" DEFAULT NULL::"text", "p_assigned_to" "uuid" DEFAULT NULL::"uuid", "p_resolution_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Validate status
  IF p_status NOT IN ('pending', 'in_progress', 'fixed', 'wont_fix', 'duplicate', 'need_more_info') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Update the feedback item
  UPDATE user_feedback
  SET
    status = p_status,
    priority = COALESCE(p_priority, priority),
    assigned_to = COALESCE(p_assigned_to, assigned_to),
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    updated_at = now()
  WHERE id = p_feedback_id
  RETURNING jsonb_build_object(
    'id', id,
    'status', status,
    'priority', priority,
    'assigned_to', assigned_to,
    'updated_at', updated_at
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Feedback item not found: %', p_feedback_id;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_feedback_status"("p_feedback_id" "uuid", "p_status" "text", "p_priority" "text", "p_assigned_to" "uuid", "p_resolution_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_feedback_status"("p_feedback_id" "uuid", "p_status" "text", "p_priority" "text", "p_assigned_to" "uuid", "p_resolution_notes" "text") IS 'Update the status and other tracking fields of a feedback item. Uses SECURITY DEFINER with SET search_path for security.';



CREATE OR REPLACE FUNCTION "public"."update_task"("p_task_id" "uuid", "p_status" "text" DEFAULT NULL::"text", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_priority" "text" DEFAULT NULL::"text", "p_due_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_result task_assignments;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    UPDATE task_assignments
    SET
        status = COALESCE(p_status, status),
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        priority = COALESCE(p_priority, priority),
        due_date = COALESCE(p_due_date, due_date),
        completed_at = CASE WHEN p_status = 'done' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = p_task_id
    AND org_id = v_org_id
    AND (assigned_to = v_user_id OR assigned_by = v_user_id)
    RETURNING * INTO v_result;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Task not found or not authorized';
    END IF;

    RETURN to_jsonb(v_result);
END;
$$;


ALTER FUNCTION "public"."update_task"("p_task_id" "uuid", "p_status" "text", "p_title" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_push_device"("p_device_token" "text", "p_platform" "text" DEFAULT 'ios'::"text", "p_bundle_id" "text" DEFAULT NULL::"text", "p_environment" "text" DEFAULT 'development'::"text", "p_authorization_status" "text" DEFAULT 'notDetermined'::"text", "p_background_refresh_enabled" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_record public.push_devices;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_device_token IS NULL OR btrim(p_device_token) = '' THEN
        RAISE EXCEPTION 'Device token is required';
    END IF;

    INSERT INTO public.push_devices (
        user_id,
        device_token,
        platform,
        bundle_id,
        environment,
        authorization_status,
        background_refresh_enabled,
        is_active,
        disabled_at,
        last_error,
        last_seen_at,
        updated_at
    )
    VALUES (
        v_user_id,
        btrim(p_device_token),
        COALESCE(NULLIF(btrim(p_platform), ''), 'ios'),
        NULLIF(btrim(p_bundle_id), ''),
        COALESCE(NULLIF(btrim(p_environment), ''), 'development'),
        COALESCE(NULLIF(btrim(p_authorization_status), ''), 'notDetermined'),
        COALESCE(p_background_refresh_enabled, FALSE),
        TRUE,
        NULL,
        NULL,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, device_token)
    DO UPDATE SET
        platform = EXCLUDED.platform,
        bundle_id = EXCLUDED.bundle_id,
        environment = EXCLUDED.environment,
        authorization_status = EXCLUDED.authorization_status,
        background_refresh_enabled = EXCLUDED.background_refresh_enabled,
        is_active = TRUE,
        disabled_at = NULL,
        last_error = NULL,
        last_seen_at = NOW(),
        updated_at = NOW()
    RETURNING * INTO v_record;

    RETURN jsonb_build_object(
        'id', v_record.id,
        'device_token', v_record.device_token,
        'platform', v_record.platform,
        'environment', v_record.environment,
        'authorization_status', v_record.authorization_status,
        'background_refresh_enabled', v_record.background_refresh_enabled,
        'updated_at', v_record.updated_at
    );
END;
$$;


ALTER FUNCTION "public"."upsert_push_device"("p_device_token" "text", "p_platform" "text", "p_bundle_id" "text", "p_environment" "text", "p_authorization_status" "text", "p_background_refresh_enabled" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_push_device"("p_device_token" "text", "p_platform" "text", "p_bundle_id" "text", "p_environment" "text", "p_authorization_status" "text", "p_background_refresh_enabled" boolean) IS 'Upserts the current authenticated user''s push device token and delivery readiness metadata.';