use std::env;
use std::sync::Arc;

use sdkwork_cloudrouter_router_service::application::{
    UpstreamCredentialSecretCodec, UpstreamCredentialSecretContext,
};
use sdkwork_cloudrouter_router_service::domain::DomainResult;
use sdkwork_cloudrouter_router_service::infrastructure::crypto::RingAeadCredentialSecretCodec;
use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresAdminUpstreamStore;
use sdkwork_cloudrouter_router_service::infrastructure::sql::PricingCatalogSql;
use sdkwork_cloudrouter_router_service::ports::{
    AdminLlmProtocolConfig, AdminUpstreamAccountGroupItem, AdminUpstreamAccountGroupMemberInput,
    AdminUpstreamListQuery, AdminUpstreamResourceInput, AdminUpstreamStore, AdminUpstreamSubject,
    AdminUpstreamSupplierAuthMethodInput, AdminUpstreamSupplierEndpointInput,
    CreateAdminUpstreamAccountCredentialCommand, LlmProtocolCode, SaveAdminUpstreamAccountCommand,
    SaveAdminUpstreamAccountGroupCommand, SaveAdminUpstreamSupplierCommand,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const REQUESTED_AT: &str = "2026-07-28T12:00:00.000Z";

#[tokio::test]
async fn postgres_upstream_store_enforces_scope_concurrency_and_secret_safety() {
    let Some(context) = PostgresTestContext::new("admin_upstream").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );
    let store = PostgresAdminUpstreamStore::new(context.pool.clone(), codec.clone());
    let subject = upstream_subject(100001, 200001);

    let supplier = store
        .save_supplier(SaveAdminUpstreamSupplierCommand {
            subject: subject.clone(),
            supplier_id: None,
            expected_version: None,
            uuid: "test-upstream-supplier-openai".to_owned(),
            supplier_code: "openai".to_owned(),
            default_vendor_code: None,
            default_base_url: Some("https://default.openai.com/v1".to_owned()),
            supplier_name: "OpenAI".to_owned(),
            display_name: "OpenAI Official".to_owned(),
            description: Some("Official upstream".to_owned()),
            supplier_type: "official".to_owned(),
            adapter_code: "openai".to_owned(),
            protocol_code: "openai".to_owned(),
            protocols: Vec::new(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            website_url: Some("https://openai.com".to_owned()),
            docs_url: Some("https://platform.openai.com/docs".to_owned()),
            region_code: Some("global".to_owned()),
            environment: 1,
            sort_order: 10,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create supplier");
    assert_eq!(0, supplier.version);
    // 供应商默认 Base URL 持久化：保存与重读一致
    assert_eq!(
        Some("https://default.openai.com/v1".to_owned()),
        supplier.default_base_url
    );

    let auth_methods = store
        .replace_supplier_auth_methods(
            subject.clone(),
            supplier.id,
            supplier.version,
            vec![AdminUpstreamSupplierAuthMethodInput {
                auth_method_code: "api-key".to_owned(),
                auth_method_name: "API key".to_owned(),
                auth_type: "api_key".to_owned(),
                config_schema: serde_json::json!({"type": "string"}),
                runtime_auth_config: serde_json::json!({
                    "credentialTransport": "bearer",
                    "defaultHeaders": {}
                }),
                priority: 10,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace auth methods");
    assert_eq!(1, auth_methods.len());

    let endpoints = store
        .replace_supplier_endpoints(
            subject.clone(),
            supplier.id,
            1,
            vec![AdminUpstreamSupplierEndpointInput {
                endpoint_code: "global".to_owned(),
                endpoint_name: "Global API".to_owned(),
                base_url: "https://api.openai.com/v1".to_owned(),
                protocol_code: Some("openai".to_owned()),
                region_code: Some("global".to_owned()),
                environment: 1,
                priority: 10,
                routing_weight: 100,
                timeout_ms: Some(30_000),
                status: 1,
                vendor_codes: vec!["openai".to_owned(), "anthropic".to_owned()],
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace endpoints");
    assert_eq!(1, endpoints.len());
    // 官方 vendor 多选持久化：重读后逐项断言
    assert_eq!(
        vec!["openai".to_owned(), "anthropic".to_owned()],
        endpoints[0].vendor_codes
    );
    let reloaded_endpoints = store
        .list_supplier_endpoints(subject.clone(), supplier.id)
        .await
        .expect("list endpoints");
    assert_eq!(
        vec!["openai".to_owned(), "anthropic".to_owned()],
        reloaded_endpoints[0].vendor_codes
    );

    store
        .replace_supplier_resources(
            subject.clone(),
            supplier.id,
            2,
            vec![resource("model:gpt-4.1")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace supplier resources");

    let account = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "test-upstream-account-openai-main".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: Some(endpoints[0].id),
            default_base_url: Some("https://account.openai.com/v1".to_owned()),
            protocols: vec![AdminLlmProtocolConfig {
                protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                base_url: "https://account-chat.openai.com/v1".to_owned(),
            }],
            account_code: "openai-main".to_owned(),
            account_name: "OpenAI main account".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: Some("org-commercial".to_owned()),
            environment: Some(1),
            region_code: Some("global".to_owned()),
            quota_limit: Some("100000.000000000000".to_owned()),
            upstream_balance_currency: Some("USD".to_owned()),
            contract_cost_multiplier: "0.850000000000".to_owned(),
            rpm_limit: Some(10_000),
            timeout_ms: Some(30_000),
            status: 1,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: None,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create upstream account");
    // 账号级 Base URL 配置持久化：默认地址与各协议覆盖保存/重读一致
    assert_eq!(
        Some("https://account.openai.com/v1".to_owned()),
        account.default_base_url
    );
    assert_eq!(
        vec![AdminLlmProtocolConfig {
            protocol_code: LlmProtocolCode::OpenaiChatCompletions,
            base_url: "https://account-chat.openai.com/v1".to_owned(),
        }],
        account.protocols
    );
    let long_secret = format!("sk-test-{}", "x".repeat(1024));
    let credential_command = CreateAdminUpstreamAccountCredentialCommand {
        subject: subject.clone(),
        account_id: account.id,
        uuid: "credential-idempotency-0001".to_owned(),
        credential_name: "Primary production key".to_owned(),
        secret: long_secret.clone(),
        priority: 10,
        expires_at: Some("2027-07-28T12:00:00.000Z".to_owned()),
        requested_at: REQUESTED_AT.to_owned(),
    };
    let credential = store
        .create_account_credential(credential_command.clone())
        .await
        .expect("create credential");
    let replay = store
        .create_account_credential(credential_command)
        .await
        .expect("idempotent credential replay");
    assert_eq!(credential.id, replay.id);
    assert_eq!(Some("sk-t****xxxx".to_owned()), credential.masked_label);
    assert_eq!(
        6,
        routing_config_version(&context.pool, subject.tenant_id, subject.organization_id).await
    );

    let stored = sqlx::query(
        "SELECT secret_ciphertext, secret_key_id, secret_fingerprint FROM ai_upstream_account_credential WHERE id = $1",
    )
    .bind(credential.id)
    .fetch_one(&context.pool)
    .await
    .expect("read encrypted credential evidence");
    let secret_ciphertext: String = stored
        .try_get("secret_ciphertext")
        .expect("secret_ciphertext");
    let secret_key_id: String = stored.try_get("secret_key_id").expect("secret_key_id");
    let secret_fingerprint: String = stored
        .try_get("secret_fingerprint")
        .expect("secret_fingerprint");
    assert!(secret_ciphertext.len() > 256);
    assert_ne!(long_secret, secret_ciphertext);
    assert_ne!(long_secret, secret_fingerprint);
    assert_eq!(
        long_secret,
        codec
            .decode_secret(
                UpstreamCredentialSecretContext::new(
                    subject.tenant_id,
                    subject.organization_id,
                    account.id,
                    credential.id,
                ),
                &secret_key_id,
                &secret_ciphertext,
            )
            .expect("decrypt stored credential")
    );

    let credential_page = store
        .list_account_credentials(list_query(subject.clone()), account.id)
        .await
        .expect("list credentials");
    assert_eq!(1, credential_page.items.len());
    assert_eq!(1, credential_page.total);

    let group = store
        .save_account_group(SaveAdminUpstreamAccountGroupCommand {
            subject: subject.clone(),
            account_group_id: None,
            expected_version: None,
            uuid: "test-upstream-account-group-default".to_owned(),
            group_code: "default".to_owned(),
            group_name: "Default routing group".to_owned(),
            description: Some("Commercial default group".to_owned()),
            group_type: "mixed".to_owned(),
            routing_strategy: "weighted".to_owned(),
            fallback_mode: "cross_supplier".to_owned(),
            priority: 10,
            cost_multiplier: "1.100000000000".to_owned(),
            sale_multiplier: "1.250000000000".to_owned(),
            environment: Some(1),
            vendor_code: None,
            modalities: Vec::new(),
            tags: Vec::new(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            is_default: false,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account group");
    store
        .replace_account_group_members(
            subject.clone(),
            group.id,
            group.version,
            vec![AdminUpstreamAccountGroupMemberInput {
                account_id: account.id,
                priority: 10,
                routing_weight: 100,
                cost_multiplier_override: Some("0.950000000000".to_owned()),
                enabled: true,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account group members");
    store
        .replace_account_group_resources(
            subject.clone(),
            group.id,
            1,
            vec![resource("model:gpt-4.1")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account group resources");

    let runtime_rows = sqlx::query(PricingCatalogSql::load_upstream_account_routes())
        .bind(30_i64)
        .fetch_all(&context.pool)
        .await
        .expect("load runtime upstream account routes");
    assert_eq!(1, runtime_rows.len());
    let runtime_row = &runtime_rows[0];
    assert_eq!(
        format!("managed://upstream-account-credential/{}", credential.id),
        runtime_row
            .try_get::<String, _>("secret_ref")
            .expect("managed secret ref")
    );
    assert_eq!(
        secret_ciphertext,
        runtime_row
            .try_get::<String, _>("secret_ciphertext")
            .expect("encrypted secret material")
    );
    assert_eq!(
        10,
        runtime_row.try_get::<i32, _>("endpoint_priority").unwrap()
    );
    assert_eq!(
        100,
        runtime_row.try_get::<i32, _>("endpoint_weight").unwrap()
    );
    // 运行时快照携带账号/供应商 Base URL 配置列（调用面按「账号 > 供应商 > 端点」解析）
    assert_eq!(
        Some("https://account.openai.com/v1".to_owned()),
        runtime_row
            .try_get::<Option<String>, _>("account_default_base_url")
            .expect("account default base url")
    );
    let account_protocols: serde_json::Value = serde_json::from_str(
        &runtime_row
            .try_get::<String, _>("account_protocols_json")
            .expect("account protocols json"),
    )
    .expect("parse account protocols");
    assert_eq!(
        Some("https://account-chat.openai.com/v1"),
        account_protocols[0]["baseUrl"].as_str()
    );
    let supplier_protocols: serde_json::Value = serde_json::from_str(
        &runtime_row
            .try_get::<String, _>("supplier_protocols_json")
            .expect("supplier protocols json"),
    )
    .expect("parse supplier protocols");
    assert_eq!(
        Some("https://default.openai.com/v1"),
        runtime_row
            .try_get::<Option<String>, _>("supplier_default_base_url")
            .expect("supplier default base url")
            .as_deref()
    );
    assert_eq!(0, supplier_protocols.as_array().map(Vec::len).unwrap_or(0));
    let bindings: serde_json::Value = serde_json::from_str(
        &runtime_row
            .try_get::<String, _>("account_group_bindings_json")
            .expect("account group bindings"),
    )
    .expect("parse account group bindings");
    // 账号自身无资源绑定：resourceEntitlements 为 null，分组×供应商作用域经
    // apiScope/capabilities 继承（V2 查询契约：resourceEntitlements 仅承载账号自身绑定）。
    assert!(
        bindings[0]["resourceEntitlements"].is_null(),
        "account without own binding inherits group scope via apiScope; resourceEntitlements stays null"
    );
    assert_ne!(serde_json::json!(["__deny__"]), bindings[0]["apiScope"]);

    sqlx::query(
        "UPDATE ai_resource_binding SET grant_type = 'deny' WHERE binding_scope = 'account_group' AND account_group_id = $1",
    )
    .bind(group.id)
    .execute(&context.pool)
    .await
    .expect("deny group resource");
    let denied_rows = sqlx::query(PricingCatalogSql::load_upstream_account_routes())
        .bind(30_i64)
        .fetch_all(&context.pool)
        .await
        .expect("load denied runtime upstream account routes");
    let denied_bindings: serde_json::Value = serde_json::from_str(
        &denied_rows[0]
            .try_get::<String, _>("account_group_bindings_json")
            .expect("denied account group bindings"),
    )
    .expect("parse denied account group bindings");
    // 账号无自身绑定 + 分组被拒绝 → 无任何可用作用域，apiScope 为空数组
    // （`__deny__` 哨兵仅对"有自身绑定但无有效作用域"的账号触发）。
    assert_eq!(
        serde_json::json!([]),
        denied_bindings[0]["apiScope"]
    );
    // 账号无自身绑定 → resourceEntitlements 保持 null（V2 契约）。
    assert!(
        denied_bindings[0]["resourceEntitlements"].is_null(),
        "account without own binding keeps resourceEntitlements null"
    );

    let isolated = store
        .list_accounts(list_query(upstream_subject(999999, 0)))
        .await
        .expect("tenant-isolated account list");
    assert_eq!(0, isolated.total);
    assert!(isolated.items.is_empty());

    let stale = store
        .replace_supplier_resources(
            subject.clone(),
            supplier.id,
            2,
            vec![resource("model:gpt-4.1-mini")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect_err("stale supplier version must fail");
    assert!(stale.is_conflict());

    let blocked = store
        .delete_account(
            subject.clone(),
            account.id,
            account.version,
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect_err("group member dependency must block account deletion");
    assert!(blocked.is_conflict());

    assert_eq!(
        9,
        routing_config_version(&context.pool, subject.tenant_id, subject.organization_id).await
    );
    assert_eq!(9, routing_config_version(&context.pool, 0, 0).await);
    let config_events = sqlx::query(
        r#"
        SELECT event_payload::text AS event_payload
        FROM ai_config_change_event
        WHERE tenant_id = $1 AND organization_id = $2 AND config_scope = 'routing'
        ORDER BY config_version ASC
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_all(&context.pool)
    .await
    .expect("load upstream routing config events");
    assert_eq!(9, config_events.len());
    for event in config_events {
        let payload: String = event.try_get("event_payload").expect("event payload");
        assert!(!payload.contains(&long_secret));
        assert!(!payload.contains(&secret_ciphertext));
    }

    context.cleanup().await;
}

#[tokio::test]
async fn postgres_upstream_account_list_decodes_protocols_as_jsonb() {
    let Some(context) = PostgresTestContext::new("admin_upstream_account_list").await else {
        return;
    };
    let subject = upstream_subject(100001, 200001);
    sqlx::raw_sql(
        r#"
        INSERT INTO ai_upstream_supplier (
            id, uuid, tenant_id, organization_id, data_scope, status,
            supplier_code, supplier_name, display_name, supplier_type,
            adapter_code, protocol_code, protocols,
            environment, sort_order
        ) VALUES (
            91001, 'upstream-list-supplier', 100001, 200001, 1, 1,
            'openai', 'OpenAI', 'OpenAI', 'official',
            'openai', 'openai', '[]'::jsonb,
            1, 10
        );

        INSERT INTO ai_upstream_supplier_auth_method (
            id, uuid, tenant_id, organization_id, data_scope, status,
            supplier_id, supplier_code, auth_method_code, auth_method_name,
            auth_type, config_schema, runtime_auth_config, priority
        ) VALUES (
            91002, 'upstream-list-auth', 100001, 200001, 1, 1,
            91001, 'openai', 'api-key', 'API key',
            'api_key', '{}'::jsonb, '{}'::jsonb, 10
        );

        INSERT INTO ai_upstream_account (
            id, uuid, tenant_id, organization_id, data_scope, status,
            supplier_id, supplier_code, default_base_url, protocols,
            account_code, account_name, auth_method_code
        ) VALUES (
            91003, 'upstream-list-account', 100001, 200001, 1, 1,
            91001, 'openai', 'https://api.openai.com/v1',
            '[{"protocolCode":"openai_chat_completions","baseUrl":"https://api.openai.com/v1"}]'::jsonb,
            'openai-primary', 'OpenAI primary', 'api-key'
        );
        "#,
    )
    .execute(&context.pool)
    .await
    .expect("seed upstream account list fixture");

    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );
    let store = PostgresAdminUpstreamStore::new(context.pool.clone(), codec);
    let page = store
        .list_accounts(list_query(subject))
        .await
        .expect("list upstream accounts with JSONB protocol configuration");

    assert_eq!(1, page.total);
    assert_eq!(1, page.items.len());
    assert_eq!(
        LlmProtocolCode::OpenaiChatCompletions,
        page.items[0].protocols[0].protocol_code
    );
    assert_eq!(
        "https://api.openai.com/v1",
        page.items[0].protocols[0].base_url
    );

    context.cleanup().await;
}

#[tokio::test]
async fn postgres_upstream_store_creates_initial_credential_atomically_with_account() {
    let Some(context) = PostgresTestContext::new("admin_upstream_atomic").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );
    let store = PostgresAdminUpstreamStore::new(context.pool.clone(), codec.clone());
    let subject = upstream_subject(100002, 200002);

    let supplier = store
        .save_supplier(SaveAdminUpstreamSupplierCommand {
            subject: subject.clone(),
            supplier_id: None,
            expected_version: None,
            uuid: "test-upstream-supplier-atomic".to_owned(),
            supplier_code: "atomic-openai".to_owned(),
            default_vendor_code: None,
            default_base_url: None,
            supplier_name: "Atomic OpenAI".to_owned(),
            display_name: "Atomic OpenAI Official".to_owned(),
            description: None,
            supplier_type: "official".to_owned(),
            adapter_code: "openai".to_owned(),
            protocol_code: "openai".to_owned(),
            protocols: Vec::new(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            website_url: None,
            docs_url: None,
            region_code: None,
            environment: 1,
            sort_order: 10,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create supplier");
    store
        .replace_supplier_auth_methods(
            subject.clone(),
            supplier.id,
            supplier.version,
            vec![AdminUpstreamSupplierAuthMethodInput {
                auth_method_code: "api-key".to_owned(),
                auth_method_name: "API key".to_owned(),
                auth_type: "api_key".to_owned(),
                config_schema: serde_json::json!({"type": "string"}),
                runtime_auth_config: serde_json::json!({
                    "credentialTransport": "bearer",
                    "defaultHeaders": {}
                }),
                priority: 10,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace auth methods");

    let api_key = "sk-atomic-initial-secret".to_owned();
    let account = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "test-upstream-account-atomic-with-key".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: None,
            default_base_url: None,
            protocols: Vec::new(),
            account_code: "atomic-with-key".to_owned(),
            account_name: "Atomic account with key".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: None,
            environment: Some(1),
            region_code: None,
            quota_limit: None,
            upstream_balance_currency: None,
            contract_cost_multiplier: "1.000000000000".to_owned(),
            rpm_limit: None,
            timeout_ms: None,
            status: 1,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: Some(api_key.clone()),
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account with initial api key");
    let credentials = store
        .list_account_credentials(list_query(subject.clone()), account.id)
        .await
        .expect("list credentials");
    assert_eq!(1, credentials.items.len());
    assert_eq!(1, credentials.total);
    assert_eq!("primary", credentials.items[0].credential_name);
    assert_eq!("api-key", credentials.items[0].auth_method_code);
    assert_eq!(
        Some("sk-a****cret".to_owned()),
        credentials.items[0].masked_label
    );

    let without_key = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "test-upstream-account-atomic-no-key".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: None,
            default_base_url: None,
            protocols: Vec::new(),
            account_code: "atomic-no-key".to_owned(),
            account_name: "Atomic account without key".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: None,
            environment: Some(1),
            region_code: None,
            quota_limit: None,
            upstream_balance_currency: None,
            contract_cost_multiplier: "1.000000000000".to_owned(),
            rpm_limit: None,
            timeout_ms: None,
            status: 1,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: None,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account without api key");
    let empty_credentials = store
        .list_account_credentials(list_query(subject.clone()), without_key.id)
        .await
        .expect("list credentials");
    assert_eq!(0, empty_credentials.items.len());

    context.cleanup().await;
}

async fn routing_config_version(pool: &PgPool, tenant_id: i64, organization_id: i64) -> i64 {
    sqlx::query_scalar(
        r#"
        SELECT config_version
        FROM ai_config_version
        WHERE tenant_id = $1 AND organization_id = $2 AND config_scope = 'routing'
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(pool)
    .await
    .expect("load routing config version")
}

async fn load_account_route_bindings(pool: &PgPool) -> serde_json::Value {
    let rows = sqlx::query(PricingCatalogSql::load_upstream_account_routes())
        .bind(30_i64)
        .fetch_all(pool)
        .await
        .expect("load runtime upstream account routes");
    assert_eq!(1, rows.len());
    serde_json::from_str(
        &rows[0]
            .try_get::<String, _>("account_group_bindings_json")
            .expect("account group bindings"),
    )
    .expect("parse account group bindings")
}

#[tokio::test]
async fn postgres_upstream_store_account_resources_scope_runtime_routes() {
    let Some(context) = PostgresTestContext::new("admin_upstream_scope").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );
    let store = PostgresAdminUpstreamStore::new(context.pool.clone(), codec.clone());
    let subject = upstream_subject(100001, 200001);

    sqlx::query(
        r#"
        INSERT INTO ai_resource (
            id, tenant_id, organization_id, resource_code, resource_type,
            vendor_code, modality_code, api_code, catalog_key, model,
            provider_native_model, status
        ) VALUES (
            9102, 100001, 200001, 'model:gpt-4.1-mini', 'model_api',
            'openai', 'chat', 'openai.chat_completions', 'openai/gpt-4.1-mini', 'gpt-4.1-mini',
            'gpt-4.1-mini', 1
        )
        "#,
    )
    .execute(&context.pool)
    .await
    .expect("insert second catalog resource");

    let supplier = store
        .save_supplier(SaveAdminUpstreamSupplierCommand {
            subject: subject.clone(),
            supplier_id: None,
            expected_version: None,
            uuid: "test-upstream-supplier-scope".to_owned(),
            supplier_code: "scope-openai".to_owned(),
            default_vendor_code: None,
            default_base_url: None,
            supplier_name: "Scope OpenAI".to_owned(),
            display_name: "Scope OpenAI Official".to_owned(),
            description: None,
            supplier_type: "official".to_owned(),
            adapter_code: "openai".to_owned(),
            protocol_code: "openai".to_owned(),
            protocols: Vec::new(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            website_url: None,
            docs_url: None,
            region_code: None,
            environment: 1,
            sort_order: 10,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create supplier");
    store
        .replace_supplier_auth_methods(
            subject.clone(),
            supplier.id,
            supplier.version,
            vec![AdminUpstreamSupplierAuthMethodInput {
                auth_method_code: "api-key".to_owned(),
                auth_method_name: "API key".to_owned(),
                auth_type: "api_key".to_owned(),
                config_schema: serde_json::json!({"type": "string"}),
                runtime_auth_config: serde_json::json!({
                    "credentialTransport": "bearer",
                    "defaultHeaders": {}
                }),
                priority: 10,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace auth methods");
    store
        .replace_supplier_endpoints(
            subject.clone(),
            supplier.id,
            1,
            vec![AdminUpstreamSupplierEndpointInput {
                endpoint_code: "global".to_owned(),
                endpoint_name: "Global API".to_owned(),
                base_url: "https://api.openai.com/v1".to_owned(),
                protocol_code: Some("openai".to_owned()),
                region_code: Some("global".to_owned()),
                environment: 1,
                priority: 10,
                routing_weight: 100,
                timeout_ms: Some(30_000),
                status: 1,
                vendor_codes: vec!["openai".to_owned()],
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace endpoints");
    store
        .replace_supplier_resources(
            subject.clone(),
            supplier.id,
            2,
            vec![resource("model:gpt-4.1")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace supplier resources");

    let account = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "test-upstream-account-scope".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: None,
            default_base_url: None,
            protocols: Vec::new(),
            account_code: "scope-main".to_owned(),
            account_name: "Scope main account".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: None,
            environment: Some(1),
            region_code: None,
            quota_limit: None,
            upstream_balance_currency: None,
            contract_cost_multiplier: "1.000000000000".to_owned(),
            rpm_limit: None,
            timeout_ms: None,
            status: 1,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: Some("sk-scope-initial".to_owned()),
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account");
    let group = store
        .save_account_group(SaveAdminUpstreamAccountGroupCommand {
            subject: subject.clone(),
            account_group_id: None,
            expected_version: None,
            uuid: "test-upstream-account-group-scope".to_owned(),
            group_code: "scope".to_owned(),
            group_name: "Scope routing group".to_owned(),
            description: None,
            group_type: "mixed".to_owned(),
            routing_strategy: "weighted".to_owned(),
            fallback_mode: "cross_supplier".to_owned(),
            priority: 10,
            cost_multiplier: "1.000000000000".to_owned(),
            sale_multiplier: "1.000000000000".to_owned(),
            environment: Some(1),
            vendor_code: None,
            modalities: Vec::new(),
            tags: Vec::new(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            is_default: false,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account group");
    store
        .replace_account_group_members(
            subject.clone(),
            group.id,
            group.version,
            vec![AdminUpstreamAccountGroupMemberInput {
                account_id: account.id,
                priority: 10,
                routing_weight: 100,
                cost_multiplier_override: None,
                enabled: true,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account group members");
    store
        .replace_account_group_resources(
            subject.clone(),
            group.id,
            1,
            vec![resource("model:gpt-4.1")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account group resources");

    // 场景 1：账号无资源绑定 → 保持分组×供应商范围（向后兼容），经 apiScope 继承；
    // resourceEntitlements 保持 null（V2 契约：仅承载账号自身绑定）。
    let bindings = load_account_route_bindings(&context.pool).await;
    assert!(
        bindings[0]["resourceEntitlements"].is_null(),
        "account without own binding inherits group scope via apiScope; resourceEntitlements stays null"
    );
    assert_ne!(serde_json::json!(["__deny__"]), bindings[0]["apiScope"]);

    // 场景 2：账号绑定与分组匹配 → 交集生效，版本与配置版本递增
    let config_before =
        routing_config_version(&context.pool, subject.tenant_id, subject.organization_id).await;
    let replaced = store
        .replace_account_resources(
            subject.clone(),
            account.id,
            account.version,
            vec![resource("model:gpt-4.1")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account resources");
    assert_eq!(1, replaced.len());
    assert_eq!(
        config_before + 1,
        routing_config_version(&context.pool, subject.tenant_id, subject.organization_id).await
    );
    let account_after = store
        .get_account(subject.clone(), account.id)
        .await
        .expect("get account")
        .expect("account exists");
    assert_eq!(account.version + 1, account_after.version);
    let bindings = load_account_route_bindings(&context.pool).await;
    assert_eq!(
        Some("model:gpt-4.1"),
        bindings[0]["resourceEntitlements"][0]["resourceCode"].as_str()
    );

    // 场景 3：账号绑定与分组无交集 → __deny__ 哨兵
    store
        .replace_account_resources(
            subject.clone(),
            account.id,
            account_after.version,
            vec![resource("model:gpt-4.1-mini")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account resources with non-matching scope");
    let bindings = load_account_route_bindings(&context.pool).await;
    assert_eq!(serde_json::json!(["__deny__"]), bindings[0]["apiScope"]);
    assert_eq!(serde_json::json!([]), bindings[0]["resourceEntitlements"]);

    // list 只返回保留的绑定（mini 保留、4.1 被 retire 软删）
    let listed = store
        .list_account_resources(subject.clone(), account.id)
        .await
        .expect("list account resources");
    assert_eq!(1, listed.len());
    assert_eq!("model:gpt-4.1-mini", listed[0].resource_code);

    // XOR 校验：resourceCode 与 resourceGroupCode 同时提供必须被拒绝
    let rejected = store
        .replace_account_resources(
            subject.clone(),
            account.id,
            account_after.version + 1,
            vec![AdminUpstreamResourceInput {
                resource_code: "model:gpt-4.1".to_owned(),
                resource_group_code: "group-a".to_owned(),
                grant_type: "allow".to_owned(),
                priority: 10,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect_err("XOR target validation must reject both codes");
    assert!(!rejected.is_conflict());
    assert!(!rejected.is_not_found());

    // 账号删除级联软删其资源绑定
    let group_latest = store
        .get_account_group(subject.clone(), group.id)
        .await
        .expect("get group")
        .expect("group exists");
    store
        .replace_account_group_members(
            subject.clone(),
            group.id,
            group_latest.version,
            Vec::new(),
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("clear account group members");
    let account_latest = store
        .get_account(subject.clone(), account.id)
        .await
        .expect("get account")
        .expect("account exists");
    store
        .delete_account(
            subject.clone(),
            account.id,
            account_latest.version,
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("delete account");
    let remaining = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_resource_binding
        WHERE tenant_id = $1 AND organization_id = $2
          AND binding_scope = 'account'
          AND account_id = $3 AND deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account.id)
    .fetch_one(&context.pool)
    .await
    .expect("count remaining account resources");
    assert_eq!(0, remaining);

    context.cleanup().await;
}

#[tokio::test]
async fn postgres_upstream_store_enforces_single_default_account_group() {
    let Some(context) = PostgresTestContext::new("admin_upstream_default").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );
    let store = PostgresAdminUpstreamStore::new(context.pool.clone(), codec.clone());
    let subject = upstream_subject(100001, 200001);

    let first = store
        .save_account_group(SaveAdminUpstreamAccountGroupCommand {
            subject: subject.clone(),
            account_group_id: None,
            expected_version: None,
            uuid: "test-upstream-account-group-first".to_owned(),
            group_code: "first-default".to_owned(),
            group_name: "First routing group".to_owned(),
            description: None,
            group_type: "mixed".to_owned(),
            routing_strategy: "weighted".to_owned(),
            fallback_mode: "cross_supplier".to_owned(),
            priority: 10,
            cost_multiplier: "1.000000000000".to_owned(),
            sale_multiplier: "1.000000000000".to_owned(),
            environment: Some(1),
            vendor_code: None,
            modalities: Vec::new(),
            tags: Vec::new(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            is_default: false,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create first group");
    assert!(!first.is_default, "new groups must not default");

    let first_promoted = promote_default(&store, &subject, &first, true)
        .await
        .expect("promote first group to default");
    assert!(first_promoted.is_default);

    let second = store
        .save_account_group(SaveAdminUpstreamAccountGroupCommand {
            subject: subject.clone(),
            account_group_id: None,
            expected_version: None,
            uuid: "test-upstream-account-group-second".to_owned(),
            group_code: "second-default".to_owned(),
            group_name: "Second routing group".to_owned(),
            description: None,
            group_type: "mixed".to_owned(),
            routing_strategy: "weighted".to_owned(),
            fallback_mode: "cross_supplier".to_owned(),
            priority: 10,
            cost_multiplier: "1.000000000000".to_owned(),
            sale_multiplier: "1.000000000000".to_owned(),
            environment: Some(1),
            vendor_code: None,
            modalities: Vec::new(),
            tags: Vec::new(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            is_default: false,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create second group");

    let second_promoted = promote_default(&store, &subject, &second, true)
        .await
        .expect("promote second group to default");
    assert!(second_promoted.is_default);
    let first_after = store
        .get_account_group(subject.clone(), first.id)
        .await
        .expect("get first group")
        .expect("first group exists");
    assert!(!first_after.is_default, "previous default must be cleared");
    assert!(
        first_after.version > first_promoted.version,
        "clearing the default must advance the previous default version"
    );

    let delete_result = store
        .delete_account_group(
            subject.clone(),
            second.id,
            second_promoted.version,
            REQUESTED_AT.to_owned(),
        )
        .await;
    let delete_error = delete_result.expect_err("deleting the default group must fail");
    assert!(
        delete_error.is_conflict(),
        "default group deletion must conflict"
    );

    store
        .delete_account_group(
            subject.clone(),
            first.id,
            first_after.version,
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("delete non-default group");

    context.cleanup().await;
}

#[tokio::test]
async fn postgres_upstream_store_stale_preferred_endpoint_does_not_block_edits() {
    let Some(context) = PostgresTestContext::new("admin_upstream_stale_preferred").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );
    let store = PostgresAdminUpstreamStore::new(context.pool.clone(), codec.clone());
    let subject = upstream_subject(100003, 200003);

    let supplier = store
        .save_supplier(SaveAdminUpstreamSupplierCommand {
            subject: subject.clone(),
            supplier_id: None,
            expected_version: None,
            uuid: "test-upstream-supplier-stale-preferred".to_owned(),
            supplier_code: "stale-supplier".to_owned(),
            default_vendor_code: None,
            default_base_url: None,
            supplier_name: "Stale preferred supplier".to_owned(),
            display_name: "Stale preferred supplier".to_owned(),
            description: None,
            supplier_type: "official".to_owned(),
            adapter_code: "openai".to_owned(),
            protocol_code: "openai".to_owned(),
            protocols: Vec::new(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            website_url: None,
            docs_url: None,
            region_code: None,
            environment: 1,
            sort_order: 10,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create supplier");
    store
        .replace_supplier_auth_methods(
            subject.clone(),
            supplier.id,
            supplier.version,
            vec![AdminUpstreamSupplierAuthMethodInput {
                auth_method_code: "api-key".to_owned(),
                auth_method_name: "API key".to_owned(),
                auth_type: "api_key".to_owned(),
                config_schema: serde_json::json!({"type": "string"}),
                runtime_auth_config: serde_json::json!({
                    "credentialTransport": "bearer",
                    "defaultHeaders": {}
                }),
                priority: 10,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace auth methods");
    let endpoints = store
        .replace_supplier_endpoints(
            subject.clone(),
            supplier.id,
            1,
            vec![
                AdminUpstreamSupplierEndpointInput {
                    endpoint_code: "primary".to_owned(),
                    endpoint_name: "Primary API".to_owned(),
                    base_url: "https://primary.example.com/v1".to_owned(),
                    protocol_code: Some("openai".to_owned()),
                    region_code: Some("global".to_owned()),
                    environment: 1,
                    priority: 10,
                    routing_weight: 100,
                    timeout_ms: Some(30_000),
                    status: 1,
                    vendor_codes: vec!["openai".to_owned()],
                },
                AdminUpstreamSupplierEndpointInput {
                    endpoint_code: "backup".to_owned(),
                    endpoint_name: "Backup API".to_owned(),
                    base_url: "https://backup.example.com/v1".to_owned(),
                    protocol_code: Some("openai".to_owned()),
                    region_code: Some("global".to_owned()),
                    environment: 1,
                    priority: 20,
                    routing_weight: 50,
                    timeout_ms: Some(30_000),
                    status: 1,
                    vendor_codes: vec!["openai".to_owned()],
                },
            ],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace endpoints");
    assert_eq!(2, endpoints.len());

    let account = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "test-upstream-account-stale-preferred".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: Some(endpoints[0].id),
            default_base_url: None,
            protocols: Vec::new(),
            account_code: "stale-preferred".to_owned(),
            account_name: "Stale preferred account".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: None,
            environment: Some(1),
            region_code: None,
            quota_limit: None,
            upstream_balance_currency: None,
            contract_cost_multiplier: "1.000000000000".to_owned(),
            rpm_limit: None,
            timeout_ms: None,
            status: 1,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: None,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account with preferred endpoint");

    // 停用当前首选端点后，编辑账号（保持首选端点不变）不再被既有失效引用阻塞
    sqlx::query("UPDATE ai_upstream_supplier_endpoint SET status = 0 WHERE id = $1")
        .bind(endpoints[0].id)
        .execute(&context.pool)
        .await
        .expect("deactivate preferred endpoint");
    let renamed = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: Some(account.id),
            expected_version: Some(account.version),
            uuid: account.uuid.clone(),
            supplier_id: supplier.id,
            preferred_endpoint_id: Some(endpoints[0].id),
            default_base_url: None,
            protocols: Vec::new(),
            account_code: account.account_code.clone(),
            account_name: "Stale preferred renamed".to_owned(),
            account_type: account.account_type.clone(),
            auth_method_code: account.auth_method_code.clone(),
            external_account_id: account.external_account_id.clone(),
            environment: account.environment,
            region_code: account.region_code.clone(),
            quota_limit: account.quota_limit.clone(),
            upstream_balance_currency: account.upstream_balance_currency.clone(),
            contract_cost_multiplier: account.contract_cost_multiplier.clone(),
            rpm_limit: account.rpm_limit,
            timeout_ms: account.timeout_ms,
            status: account.status,
            billing_mode: account.billing_mode.clone(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: None,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("edit account while preferred endpoint is inactive");
    assert_eq!(Some(endpoints[0].id), renamed.preferred_endpoint_id);

    // 显式清除（null）语义：恢复自动选择
    let cleared = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: Some(account.id),
            expected_version: Some(renamed.version),
            uuid: account.uuid.clone(),
            supplier_id: supplier.id,
            preferred_endpoint_id: None,
            default_base_url: None,
            protocols: Vec::new(),
            account_code: account.account_code.clone(),
            account_name: renamed.account_name.clone(),
            account_type: account.account_type.clone(),
            auth_method_code: account.auth_method_code.clone(),
            external_account_id: account.external_account_id.clone(),
            environment: account.environment,
            region_code: account.region_code.clone(),
            quota_limit: account.quota_limit.clone(),
            upstream_balance_currency: account.upstream_balance_currency.clone(),
            contract_cost_multiplier: account.contract_cost_multiplier.clone(),
            rpm_limit: account.rpm_limit,
            timeout_ms: account.timeout_ms,
            status: account.status,
            billing_mode: account.billing_mode.clone(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: None,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("clear stale preferred endpoint");
    assert_eq!(None, cleared.preferred_endpoint_id);

    // 将停用的端点显式设为新的首选端点 → 拒绝
    sqlx::query("UPDATE ai_upstream_supplier_endpoint SET status = 0 WHERE id = $1")
        .bind(endpoints[1].id)
        .execute(&context.pool)
        .await
        .expect("deactivate backup endpoint");
    let blocked = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: Some(account.id),
            expected_version: Some(cleared.version),
            uuid: account.uuid.clone(),
            supplier_id: supplier.id,
            preferred_endpoint_id: Some(endpoints[1].id),
            default_base_url: None,
            protocols: Vec::new(),
            account_code: account.account_code.clone(),
            account_name: renamed.account_name.clone(),
            account_type: account.account_type.clone(),
            auth_method_code: account.auth_method_code.clone(),
            external_account_id: account.external_account_id.clone(),
            environment: account.environment,
            region_code: account.region_code.clone(),
            quota_limit: account.quota_limit.clone(),
            upstream_balance_currency: account.upstream_balance_currency.clone(),
            contract_cost_multiplier: account.contract_cost_multiplier.clone(),
            rpm_limit: account.rpm_limit,
            timeout_ms: account.timeout_ms,
            status: account.status,
            billing_mode: account.billing_mode.clone(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: None,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect_err("binding an inactive endpoint must be rejected");
    assert!(blocked.is_not_found());

    context.cleanup().await;
}

async fn promote_default(
    store: &PostgresAdminUpstreamStore,
    subject: &AdminUpstreamSubject,
    item: &AdminUpstreamAccountGroupItem,
    is_default: bool,
) -> DomainResult<AdminUpstreamAccountGroupItem> {
    store
        .save_account_group(SaveAdminUpstreamAccountGroupCommand {
            subject: subject.clone(),
            account_group_id: Some(item.id),
            expected_version: Some(item.version),
            uuid: item.uuid.clone(),
            group_code: item.group_code.clone(),
            group_name: item.group_name.clone(),
            description: item.description.clone(),
            group_type: item.group_type.clone(),
            routing_strategy: item.routing_strategy.clone(),
            fallback_mode: item.fallback_mode.clone(),
            priority: item.priority,
            cost_multiplier: item.cost_multiplier.clone(),
            sale_multiplier: item.sale_multiplier.clone(),
            environment: item.environment,
            vendor_code: item.vendor_code.clone(),
            modalities: item.modalities.clone(),
            tags: item.tags.clone(),
            model_blacklist: item.model_blacklist.clone(),
            model_whitelist: item.model_whitelist.clone(),
            is_default,
            status: item.status,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
}

fn upstream_subject(tenant_id: i64, organization_id: i64) -> AdminUpstreamSubject {
    AdminUpstreamSubject {
        tenant_id,
        organization_id,
        operator_id: 300001,
        operator_type: 1,
    }
}

fn list_query(subject: AdminUpstreamSubject) -> AdminUpstreamListQuery {
    AdminUpstreamListQuery {
        subject,
        q: None,
        page: 1,
        page_size: 20,
        offset: 0,
    }
}

fn resource(resource_code: &str) -> AdminUpstreamResourceInput {
    AdminUpstreamResourceInput {
        resource_code: resource_code.to_owned(),
        resource_group_code: String::new(),
        grant_type: "allow".to_owned(),
        priority: 10,
        status: 1,
    }
}

struct PostgresTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl PostgresTestContext {
    async fn new(label: &str) -> Option<Self> {
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping Postgres upstream store test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = format!(
            "test_{}_{}_{}",
            label,
            std::process::id(),
            sdkwork_utils_rust::now().timestamp_millis().unsigned_abs()
        );
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .expect("connect PostgreSQL admin pool");
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_schema}"
        )))
        .execute(&admin_pool)
        .await
        .expect("create test schema");
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(4)
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(sqlx::AssertSqlSafe(format!(
                        "SET search_path TO {}",
                        quote_identifier(&schema)
                    )))
                    .execute(&mut *connection)
                    .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await
            .expect("connect PostgreSQL test pool");
        sqlx::raw_sql(include_str!(
            "../../../database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create CloudRouter schema");
        sqlx::raw_sql(include_str!(
            "../../../database/modules/gateway-iam/ddl/baseline/postgres/0001_gateway_iam_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create Gateway IAM schema");
        sqlx::raw_sql(include_str!(
            "../../../database/migrations/postgres/0020_upstream_account_group_default_flag.up.sql"
        ))
        .execute(&pool)
        .await
        .expect("apply upstream account group default flag migration");
        // NOTE: 0025/0026 (columnar model_blacklist/model_whitelist) are intentionally
        // NOT applied here. Migration 0033 DROPs those columns in the production schema;
        // the test schema must reflect the current authority (ai_model_access_policy).
        sqlx::raw_sql(include_str!(
            "../../../database/migrations/postgres/0027_add_upstream_supplier_endpoint_vendors.up.sql"
        ))
        .execute(&pool)
        .await
        .expect("apply upstream supplier endpoint vendor codes migration");
        sqlx::raw_sql(include_str!(
            "../../../database/migrations/postgres/0028_add_upstream_supplier_default_base_url.up.sql"
        ))
        .execute(&pool)
        .await
        .expect("apply upstream supplier default base URL migration");
        sqlx::raw_sql(include_str!(
            "../../../database/migrations/postgres/0030_add_upstream_account_base_urls.up.sql"
        ))
        .execute(&pool)
        .await
        .expect("apply upstream account base URL migration");
        create_resource_catalog(&pool).await;
        seed_pricing_plan(&pool).await;
        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        self.pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&self.database_url)
            .await
            .expect("reconnect PostgreSQL admin pool");
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&self.schema)
        )))
        .execute(&admin_pool)
        .await
        .expect("drop test schema");
        admin_pool.close().await;
    }
}

async fn create_resource_catalog(pool: &PgPool) {
    sqlx::raw_sql(
        r#"
        CREATE TABLE ai_resource (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            resource_code VARCHAR(128) NOT NULL,
            resource_type VARCHAR(64) NOT NULL,
            route_kind VARCHAR(16) NOT NULL DEFAULT 'api',
            vendor_code VARCHAR(64),
            modality_code VARCHAR(64),
            api_code VARCHAR(128),
            catalog_key VARCHAR(256),
            model VARCHAR(256),
            provider_native_model VARCHAR(256),
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        );
        CREATE TABLE ai_resource_group (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            group_code VARCHAR(128) NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        );
        CREATE TABLE ai_resource_group_item (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            resource_group_id BIGINT NOT NULL,
            resource_group_code VARCHAR(128) NOT NULL,
            resource_id BIGINT,
            resource_code VARCHAR(128),
            child_resource_group_id BIGINT,
            child_resource_group_code VARCHAR(128),
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        );
        INSERT INTO ai_resource (
            id, tenant_id, organization_id, resource_code, resource_type,
            vendor_code, modality_code, api_code, catalog_key, model,
            provider_native_model, status
        ) VALUES (
            9101, 100001, 200001, 'model:gpt-4.1', 'model_api',
            'openai', 'chat', 'openai.chat_completions', 'openai/gpt-4.1', 'gpt-4.1',
            'gpt-4.1', 1
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("create resource catalog fixture");
}

/// Seeds the default `standard` pricing plan so account group creation can bind
/// its rate card (`ensure_account_group_rate_card` requires an active plan).
async fn seed_pricing_plan(pool: &PgPool) {
    sqlx::raw_sql(
        r#"
        INSERT INTO cloudrouter_pricing_plan (
            id, uuid, tenant_id, organization_id, data_scope, status, metadata,
            plan_code, plan_name, base_price_side, currency_code, fallback_policy,
            rounding_mode, minimum_charge_amount, effective_from
        ) VALUES (
            99_041, 'test-standard-plan', 0, 0, 0, 1, '{}'::jsonb,
            'standard', 'Standard plan', 'official_reference', 'USD', 'fail_closed',
            'half_up', 0, '1970-01-01T00:00:00Z'
        )
        "#,
    )
    .execute(pool)
    .await
    .expect("seed standard pricing plan");
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
