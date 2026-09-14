-- ============================================================================
-- create_functions_billing
-- Functions for subscriptions, usage limits and billing.
-- ============================================================================




CREATE OR REPLACE FUNCTION "public"."check_and_reset_monthly_usage"("p_org_id" "uuid") RETURNS TABLE("needs_reset" boolean, "current_usage" numeric, "monthly_limit" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_reset_date TIMESTAMPTZ;
    v_current_usage DECIMAL;
    v_monthly_limit DECIMAL;
    v_needs_reset BOOLEAN := false;
BEGIN
    -- Get current organization data
    SELECT
        gemini_usage_reset_date,
        gemini_monthly_usage,
        gemini_monthly_limit
    INTO v_reset_date, v_current_usage, v_monthly_limit
    FROM organizations
    WHERE id = p_org_id;

    -- Check if we need to reset (30 days have passed)
    IF v_reset_date IS NULL OR (CURRENT_TIMESTAMP - v_reset_date) > INTERVAL '30 days' THEN
        v_needs_reset := true;

        -- Reset the usage
        UPDATE organizations
        SET
            gemini_monthly_usage = 0,
            gemini_usage_reset_date = CURRENT_TIMESTAMP
        WHERE id = p_org_id;

        v_current_usage := 0;
    END IF;

    RETURN QUERY
    SELECT v_needs_reset, v_current_usage, v_monthly_limit;
END;
$$;


ALTER FUNCTION "public"."check_and_reset_monthly_usage"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_budget_alerts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  utilization NUMERIC;
  old_utilization NUMERIC;
  alert_severity TEXT;
  threshold_crossed TEXT;
BEGIN
  -- Skip if budget is zero
  IF NEW.budget_cents = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate utilizations
  utilization := (NEW.spent_cents::NUMERIC / NEW.budget_cents * 100);
  old_utilization := CASE
    WHEN OLD.budget_cents > 0 THEN (OLD.spent_cents::NUMERIC / OLD.budget_cents * 100)
    ELSE 0
  END;

  -- Check for threshold crossings
  IF (utilization >= 75 AND old_utilization < 75) THEN
    threshold_crossed := '75%';
    alert_severity := 'low';
  ELSIF (utilization >= 90 AND old_utilization < 90) THEN
    threshold_crossed := '90%';
    alert_severity := 'medium';
  ELSIF (utilization >= 95 AND old_utilization < 95) THEN
    threshold_crossed := '95%';
    alert_severity := 'high';
  ELSIF (utilization >= 100 AND old_utilization < 100) THEN
    threshold_crossed := '100%';
    alert_severity := 'critical';
  END IF;

  -- Insert alert if threshold was crossed
  IF threshold_crossed IS NOT NULL THEN
    INSERT INTO campaign_alerts (
      org_id,
      campaign_id,
      alert_type,
      severity,
      title,
      message,
      data,
      expires_at
    ) VALUES (
      NEW.org_id,
      NEW.id,
      'budget_threshold',
      alert_severity,
      format('Budget Alert: %s (%s)', NEW.name, threshold_crossed),
      format('Campaign "%s" has used %s of its $%s budget ($%s spent)',
        NEW.name,
        threshold_crossed,
        (NEW.budget_cents / 100.0)::MONEY,
        (NEW.spent_cents / 100.0)::MONEY
      ),
      jsonb_build_object(
        'campaign_id', NEW.id,
        'campaign_name', NEW.name,
        'utilization', ROUND(utilization, 2),
        'budget_cents', NEW.budget_cents,
        'spent_cents', NEW.spent_cents,
        'threshold_crossed', threshold_crossed,
        'performance_metrics', jsonb_build_object(
          'conversions', COALESCE(NEW.conversions, 0),
          'reach', COALESCE(NEW.reach, 0),
          'cost_per_click', COALESCE(NEW.cost_per_click, 0)
        ),
        'recommendations', CASE
          WHEN utilization >= 100 THEN ARRAY['Pause campaign immediately', 'Review performance metrics', 'Consider budget reallocation']
          WHEN utilization >= 95 THEN ARRAY['Monitor closely', 'Prepare to pause underperforming ad sets', 'Review targeting']
          WHEN utilization >= 90 THEN ARRAY['Review campaign performance', 'Optimize ad spend', 'Consider budget adjustment']
          ELSE ARRAY['Monitor campaign performance', 'Optimize targeting if needed']
        END
      ),
      NOW() + INTERVAL '7 days'
    );
  END IF;

  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."check_budget_alerts"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."create_test_budget_alert"("p_campaign_id" "uuid", "p_severity" "text" DEFAULT 'warning'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_alert_id UUID;
  v_campaign RECORD;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found: %', p_campaign_id;
  END IF;

  -- Insert test alert
  INSERT INTO campaign_alerts (
    org_id,
    campaign_id,
    alert_type,
    severity,
    title,
    message,
    data
  ) VALUES (
    v_campaign.org_id,
    p_campaign_id,
    'budget_threshold',
    p_severity,
    format('Test Alert: %s', v_campaign.name),
    format('This is a test budget alert for campaign "%s"', v_campaign.name),
    jsonb_build_object(
      'campaign_id', p_campaign_id,
      'test_alert', true,
      'created_at', NOW()
    )
  )
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$;


ALTER FUNCTION "public"."create_test_budget_alert"("p_campaign_id" "uuid", "p_severity" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_test_budget_alert"("p_org_id" "uuid", "p_campaign_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  test_campaign_id UUID;
  alert_id UUID;
BEGIN
  -- Use provided campaign or find one
  IF p_campaign_id IS NULL THEN
    SELECT id INTO test_campaign_id
    FROM campaigns
    WHERE org_id = p_org_id
      AND archived_at IS NULL
    LIMIT 1;
  ELSE
    test_campaign_id := p_campaign_id;
  END IF;

  -- Create test alert
  INSERT INTO campaign_alerts (
    org_id,
    campaign_id,
    alert_type,
    severity,
    title,
    message,
    data
  ) VALUES (
    p_org_id,
    test_campaign_id,
    'budget_threshold',
    'high',
    'Budget Warning - Test Alert',
    'This is a test budget alert to verify real-time functionality',
    json_build_object(
      'campaign_id', test_campaign_id,
      'utilization', 92.5,
      'threshold_crossed', '90%',
      'test_alert', true
    )
  ) RETURNING id INTO alert_id;

  RETURN alert_id;
END;
$$;


ALTER FUNCTION "public"."create_test_budget_alert"("p_org_id" "uuid", "p_campaign_id" "uuid") OWNER TO "postgres";