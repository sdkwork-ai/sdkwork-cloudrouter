DO $sdkwork_verify$
BEGIN
    IF (SELECT count(*) FROM ai_upstream_supplier) <> 2
        OR (SELECT count(*) FROM ai_upstream_account) <> 3
        OR (SELECT count(*) FROM ai_upstream_supplier_endpoint) <> 2
        OR (SELECT count(*) FROM ai_upstream_supplier_auth_method) <> 2
        OR (SELECT count(*) FROM ai_upstream_account_credential) <> 3
        OR (SELECT count(*) FROM ai_upstream_account_group) <> 1
        OR (SELECT count(*) FROM ai_upstream_account_group_member) <> 3
        OR (SELECT count(*) FROM ai_upstream_supplier_resource) <> 2
        OR (SELECT count(*) FROM ai_upstream_account_group_resource) <> 1
        OR (SELECT count(*) FROM iam_gateway_api_key_account_group) <> 1
    THEN
        RAISE EXCEPTION 'legacy upstream fixture row counts were not preserved';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name IN (
               'ai_provider', 'ai_site', 'ai_site_service', 'ai_channel',
               'ai_channel_credential', 'ai_channel_group',
               'ai_channel_group_member', 'ai_channel_group_metric_snapshot',
               'ai_channel_group_resource', 'ai_channel_resource',
               'ai_usage_service_provider_edge',
               'iam_gateway_api_key_channel_group'
           )
    ) THEN
        RAISE EXCEPTION 'legacy upstream tables remain after migration';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM ai_routing_decision_log
         WHERE id = 320 AND selected_supplier_id = 10 AND selected_account_id = 100
    ) OR NOT EXISTS (
        SELECT 1 FROM ai_usage
         WHERE id = 330 AND supplier_id = 10 AND account_id = 100 AND account_group_id = 200
    ) OR NOT EXISTS (
        SELECT 1 FROM ai_request_trace
         WHERE id = 340 AND supplier_id = 10 AND account_id = 100 AND account_group_id = 200
    ) OR NOT EXISTS (
        SELECT 1 FROM ai_pricing_rule
         WHERE id = 301 AND supplier_code = 'openai' AND account_id = 100
    ) OR NOT EXISTS (
        SELECT 1 FROM ai_provider_object_route
         WHERE id = 310 AND supplier_code = 'openai' AND account_id = 100 AND account_group_id = 200
    ) THEN
        RAISE EXCEPTION 'legacy routing dimensions were not preserved';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM ai_upstream_account a
          JOIN ai_upstream_supplier_endpoint e
            ON e.tenant_id = a.tenant_id
           AND e.organization_id = a.organization_id
           AND e.id = a.preferred_endpoint_id
         WHERE a.supplier_id <> e.supplier_id
    ) OR EXISTS (
        SELECT 1
          FROM ai_upstream_account_credential c
          JOIN ai_upstream_account a
            ON a.tenant_id = c.tenant_id
           AND a.organization_id = c.organization_id
           AND a.id = c.account_id
         WHERE c.auth_method_code <> a.auth_method_code
    ) THEN
        RAISE EXCEPTION 'canonical upstream ownership invariants were violated';
    END IF;
END
$sdkwork_verify$;
