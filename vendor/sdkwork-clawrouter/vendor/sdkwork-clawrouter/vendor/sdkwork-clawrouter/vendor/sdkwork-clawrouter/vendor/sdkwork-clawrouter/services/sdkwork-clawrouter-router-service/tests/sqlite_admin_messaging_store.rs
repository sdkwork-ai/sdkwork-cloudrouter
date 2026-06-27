use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminMessagingStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminMessagingRouteSimulationCommand, AdminMessagingStore, AdminMessagingSubject,
    AdminMessagingTemplateSendCommand, AdminMessagingTestSendCommand,
    CreateMessagingProviderAccountCommand, CreateMessagingRouteRuleCommand,
    CreateMessagingSenderIdentityCommand, CreateMessagingSuppressionCommand,
    CreateMessagingTemplateCommand, ListAdminMessagingRecordsQuery,
    MessagingRouteRuleTargetCommand, PublishMessagingTemplateVersionCommand,
    UpdateVerificationPolicyCommand,
};
use serde_json::json;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Row;

#[tokio::test]
async fn sqlite_admin_messaging_store_writes_delivery_building_blocks_and_replays_test_send_idempotently(
) {
    let pool = create_pool().await;
    create_messaging_tables(&pool).await;
    seed_messaging_reference_data(&pool).await;

    let store = SqliteAdminMessagingStore::new(pool.clone());
    let provider = store
        .create_provider_account(CreateMessagingProviderAccountCommand {
            subject: subject(),
            provider_code: "aliyun_sms".to_owned(),
            account_code: "aliyun-primary".to_owned(),
            account_name: "Aliyun Primary SMS".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: Some("verification".to_owned()),
            base_url: Some("https://dysmsapi.aliyuncs.test".to_owned()),
            secret_ref: "vault://messaging/aliyun-primary".to_owned(),
            auth_type: Some("access_key".to_owned()),
            capability_schema: json!({
                "supportsTemplateSync": true,
                "supportsDeliveryReceipt": true,
                "supportsBatchSend": true,
                "supportsWebhook": false,
                "sandboxSupported": true
            }),
            idempotency_key: "idem-provider-create".to_owned(),
            request_id: "req-provider-create".to_owned(),
        })
        .await
        .expect("provider account should be created");

    let provider_retry = store
        .create_provider_account(CreateMessagingProviderAccountCommand {
            idempotency_key: "idem-provider-create".to_owned(),
            request_id: "req-provider-create".to_owned(),
            subject: subject(),
            provider_code: "aliyun_sms".to_owned(),
            account_code: "aliyun-primary".to_owned(),
            account_name: "Aliyun Primary SMS".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: Some("verification".to_owned()),
            base_url: Some("https://dysmsapi.aliyuncs.test".to_owned()),
            secret_ref: "vault://messaging/aliyun-primary".to_owned(),
            auth_type: Some("access_key".to_owned()),
            capability_schema: json!({ "supportsTemplateSync": true }),
        })
        .await
        .expect("provider account retry should be idempotent");
    assert_eq!(provider.id, provider_retry.id);

    let secret_ref: String =
        sqlx::query_scalar("SELECT secret_ref FROM integration_provider_account WHERE id = ?1")
            .bind(provider.id.parse::<i64>().unwrap())
            .fetch_one(&pool)
            .await
            .expect("provider account secret ref should load");
    assert_eq!("vault://messaging/aliyun-primary", secret_ref);

    let messaging_secret_columns: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM pragma_table_info('messaging_provider_capability')
        WHERE name LIKE '%secret%'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("messaging capability schema should be introspectable");
    assert_eq!(0, messaging_secret_columns);

    let provider_accounts = store
        .list_provider_accounts(list_query())
        .await
        .expect("provider accounts should list");
    assert_eq!(1, provider_accounts.total);
    assert_eq!("aliyun_sms", provider_accounts.items[0]["providerCode"]);
    assert!(provider_accounts.items[0].get("secretRef").is_none());

    let sender = store
        .create_sender_identity(CreateMessagingSenderIdentityCommand {
            subject: subject(),
            provider_account_id: provider.id.clone(),
            channel: "sms".to_owned(),
            identity_code: "sdkwork-sign".to_owned(),
            display_name: Some("SDKWORK Sign".to_owned()),
            from_email: None,
            from_name: None,
            reply_to: None,
            domain_name: None,
            sign_name: Some("SDKWORK".to_owned()),
            sender_id: None,
            country_code: Some("CN".to_owned()),
            idempotency_key: "idem-sender-create".to_owned(),
            request_id: "req-sender-create".to_owned(),
        })
        .await
        .expect("sender identity should be created");
    assert_eq!("draft", sender.status);
    let sender_identities = store
        .list_sender_identities(list_query())
        .await
        .expect("sender identities should list display fields");
    assert_eq!("SDKWORK Sign", sender_identities.items[0]["displayName"]);

    let template = store
        .create_template(CreateMessagingTemplateCommand {
            subject: subject(),
            template_code: "LOGIN_SMS_OTP".to_owned(),
            scene_code: "login".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "verification".to_owned(),
            category: "otp".to_owned(),
            template_name: "Login SMS OTP".to_owned(),
            subject_template: None,
            body_template: "Your code is {{code}}.".to_owned(),
            content_format: Some("text".to_owned()),
            locale: Some("zh-CN".to_owned()),
            variable_schema: json!({
                "type": "object",
                "required": ["code"],
                "properties": { "code": { "type": "string" } }
            }),
            idempotency_key: "idem-template-create".to_owned(),
            request_id: "req-template-create".to_owned(),
        })
        .await
        .expect("template should be created");
    assert_eq!("draft", template.status);

    let version_id: i64 =
        sqlx::query_scalar("SELECT current_version_id FROM messaging_template WHERE id = ?1")
            .bind(template.id.parse::<i64>().unwrap())
            .fetch_one(&pool)
            .await
            .expect("current template version should load");
    let published = store
        .publish_template_version(PublishMessagingTemplateVersionCommand {
            subject: subject(),
            template_id: template.id.clone(),
            version_id: version_id.to_string(),
            request_id: "req-template-publish".to_owned(),
        })
        .await
        .expect("template version should publish");
    assert_eq!("published", published.status);
    let templates = store
        .list_templates(list_query())
        .await
        .expect("templates should list publish fields");
    assert_eq!("published", templates.items[0]["publishStatus"]);

    let route = store
        .create_route_rule(CreateMessagingRouteRuleCommand {
            subject: subject(),
            rule_code: "login-sms-primary".to_owned(),
            scene_code: "login".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "verification".to_owned(),
            country_code: Some("*".to_owned()),
            locale: Some("*".to_owned()),
            user_segment: None,
            priority: Some(10),
            failover_policy: json!({ "mode": "ordered" }),
            targets: vec![MessagingRouteRuleTargetCommand {
                provider_account_id: provider.id.clone(),
                sender_identity_id: Some(sender.id.clone()),
                template_binding_id: None,
                target_order: 1,
                weight: Some(100),
            }],
            idempotency_key: "idem-route-create".to_owned(),
            request_id: "req-route-create".to_owned(),
        })
        .await
        .expect("route rule should be created");
    assert_eq!("active", route.status);

    let simulation = store
        .simulate_route(AdminMessagingRouteSimulationCommand {
            subject: subject(),
            scene_code: "login".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "verification".to_owned(),
            country_code: Some("CN".to_owned()),
            locale: Some("zh-CN".to_owned()),
            user_segment: None,
            request_id: "req-route-simulate".to_owned(),
        })
        .await
        .expect("route simulation should load matching target");
    assert!(simulation.matched);
    assert_eq!(Some(route.id.clone()), simulation.route_rule_id);
    assert_eq!(1, simulation.targets.len());
    assert_eq!("aliyun_sms", simulation.targets[0]["providerCode"]);

    let test_send = store
        .test_send(AdminMessagingTestSendCommand {
            subject: subject(),
            scene_code: "login".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "verification".to_owned(),
            template_code: "LOGIN_SMS_OTP".to_owned(),
            country_code: Some("CN".to_owned()),
            locale: Some("zh-CN".to_owned()),
            user_segment: None,
            target_masked: "+86******1234".to_owned(),
            target_hash: "target-hash-login".to_owned(),
            dry_run: Some(true),
            variables: json!({ "code": "123456" }),
            idempotency_key: "idem-test-send".to_owned(),
            request_id: "req-test-send".to_owned(),
        })
        .await
        .expect("test send dry-run should create request and diagnostic event");
    assert_eq!("dry_run", test_send.delivery_status);
    assert_eq!(Some("aliyun_sms".to_owned()), test_send.provider_code);

    let dry_run_attempt_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM messaging_send_attempt a
        JOIN messaging_send_request r ON r.id = a.send_request_id
        WHERE r.request_id = ?1
        "#,
    )
    .bind("req-test-send")
    .fetch_one(&pool)
    .await
    .expect("dry-run test send attempt count should load");
    assert_eq!(0, dry_run_attempt_count);

    let dry_run_rate_limit_events: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(send_count + reject_count), 0)
        FROM messaging_rate_limit_bucket
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND scene_code = 'login'
          AND channel = 'sms'
          AND target_hash = 'target-hash-login'
          AND ip_hash = '*'
          AND device_hash = '*'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("dry-run test send should not mutate rate-limit buckets");
    assert_eq!(0, dry_run_rate_limit_events);

    let test_send_retry = store
        .test_send(AdminMessagingTestSendCommand {
            subject: subject(),
            scene_code: "login".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "verification".to_owned(),
            template_code: "LOGIN_SMS_OTP".to_owned(),
            country_code: Some("CN".to_owned()),
            locale: Some("zh-CN".to_owned()),
            user_segment: None,
            target_masked: "+86******1234".to_owned(),
            target_hash: "target-hash-login".to_owned(),
            dry_run: Some(true),
            variables: json!({ "code": "123456" }),
            idempotency_key: "idem-test-send".to_owned(),
            request_id: "req-test-send".to_owned(),
        })
        .await
        .expect("test send retry should return the same observable result");
    assert_eq!(test_send.request_id, test_send_retry.request_id);
    assert_eq!(test_send.delivery_status, test_send_retry.delivery_status);
    assert_eq!(test_send.provider_code, test_send_retry.provider_code);

    let delivery_event = sqlx::query(
        r#"
        SELECT e.event_type, e.provider_code, e.provider_event_id, e.payload_redacted
        FROM messaging_delivery_event e
        JOIN messaging_send_request r ON r.id = e.send_request_id
        WHERE r.request_id = ?1
        "#,
    )
    .bind("req-test-send")
    .fetch_one(&pool)
    .await
    .expect("dry-run test send should emit a delivery event");
    assert_eq!("dry_run", delivery_event.get::<String, _>("event_type"));
    assert_eq!(
        "aliyun_sms",
        delivery_event.get::<String, _>("provider_code")
    );
    assert!(delivery_event
        .get::<String, _>("provider_event_id")
        .contains("dry_run"));
    let delivery_event_payload = delivery_event.get::<String, _>("payload_redacted");
    assert!(delivery_event_payload.contains("\"deliveryStatus\":\"dry_run\""));
    assert!(delivery_event_payload.contains("\"variableKeys\":[\"code\"]"));
    assert!(!delivery_event_payload.contains("123456"));

    let request_payload: String = sqlx::query_scalar(
        "SELECT request_payload_redacted FROM messaging_send_request WHERE request_id = ?1",
    )
    .bind("req-test-send")
    .fetch_one(&pool)
    .await
    .expect("dry-run request redacted payload should load");
    assert!(request_payload.contains("\"variableKeys\":[\"code\"]"));
    assert!(!request_payload.contains("123456"));

    let send_requests = store
        .list_send_requests(list_query())
        .await
        .expect("send requests should include frontend delivery status");
    assert_eq!("dry_run", send_requests.items[0]["deliveryStatus"]);
    assert!(send_requests.items[0]["createdAt"].as_str().is_some());
    assert!(send_requests.items[0]["failedAt"].as_str().is_some());

    sqlx::query(
        r#"
        INSERT INTO messaging_rate_limit_bucket
            (id, uuid, tenant_id, organization_id, status, scene_code, channel, target_hash,
             ip_hash, device_hash, window_start, window_seconds, send_count, verify_count, reject_count)
        VALUES
            (2003, 'bucket-login-rate-limited', 100001, 0, 1, 'login', 'sms', 'target-hash-rate-limited',
             '*', '*', strftime('%Y-%m-%d %H:00:00', 'now'), 3600, 5, 0, 0)
        "#,
    )
    .execute(&pool)
    .await
    .expect("current verification bucket should seed at policy limit");

    let rate_limited = store
        .test_send(AdminMessagingTestSendCommand {
            subject: subject(),
            scene_code: "login".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "verification".to_owned(),
            template_code: "LOGIN_SMS_OTP".to_owned(),
            country_code: Some("CN".to_owned()),
            locale: Some("zh-CN".to_owned()),
            user_segment: None,
            target_masked: "+86******9999".to_owned(),
            target_hash: "target-hash-rate-limited".to_owned(),
            dry_run: Some(false),
            variables: json!({ "code": "654321" }),
            idempotency_key: "idem-test-send-rate-limited".to_owned(),
            request_id: "req-test-send-rate-limited".to_owned(),
        })
        .await
        .expect("verification send at hourly policy limit should be recorded as rate limited");
    assert_eq!("rate_limited", rate_limited.delivery_status);
    assert_eq!(Some("aliyun_sms".to_owned()), rate_limited.provider_code);

    let rate_limited_attempt_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM messaging_send_attempt a
        JOIN messaging_send_request r ON r.id = a.send_request_id
        WHERE r.request_id = ?1
        "#,
    )
    .bind("req-test-send-rate-limited")
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0, rate_limited_attempt_count);

    let rate_limited_event: String = sqlx::query_scalar(
        r#"
        SELECT e.event_type
        FROM messaging_delivery_event e
        JOIN messaging_send_request r ON r.id = e.send_request_id
        WHERE r.request_id = ?1
        "#,
    )
    .bind("req-test-send-rate-limited")
    .fetch_one(&pool)
    .await
    .expect("rate-limited send should emit a delivery event");
    assert_eq!("rate_limited", rate_limited_event);

    let reject_count: i64 = sqlx::query_scalar(
        r#"
        SELECT reject_count
        FROM messaging_rate_limit_bucket
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND scene_code = 'login'
          AND channel = 'sms'
          AND target_hash = 'target-hash-rate-limited'
          AND ip_hash = '*'
          AND device_hash = '*'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("rate-limited send should increment rejection bucket");
    assert_eq!(1, reject_count);

    let send_request_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM messaging_send_request")
        .fetch_one(&pool)
        .await
        .unwrap();
    let send_attempt_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM messaging_send_attempt")
        .fetch_one(&pool)
        .await
        .unwrap();
    let audit_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM ops_audit_log WHERE action LIKE 'messaging.%'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(2, send_request_count);
    assert_eq!(0, send_attempt_count);
    assert_eq!(8, audit_count);
}

#[tokio::test]
async fn sqlite_admin_messaging_store_rejects_route_target_sender_identity_from_another_account() {
    let pool = create_pool().await;
    create_messaging_tables(&pool).await;
    seed_messaging_reference_data(&pool).await;

    let store = SqliteAdminMessagingStore::new(pool.clone());
    let primary_provider = store
        .create_provider_account(CreateMessagingProviderAccountCommand {
            subject: subject(),
            provider_code: "aliyun_sms".to_owned(),
            account_code: "aliyun-primary".to_owned(),
            account_name: "Aliyun Primary SMS".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: Some("verification".to_owned()),
            base_url: Some("https://dysmsapi.aliyuncs.test".to_owned()),
            secret_ref: "vault://messaging/aliyun-primary".to_owned(),
            auth_type: Some("access_key".to_owned()),
            capability_schema: json!({ "supportsDeliveryReceipt": true }),
            idempotency_key: "idem-primary-provider-create".to_owned(),
            request_id: "req-primary-provider-create".to_owned(),
        })
        .await
        .expect("primary provider account should be created");

    let sender = store
        .create_sender_identity(CreateMessagingSenderIdentityCommand {
            subject: subject(),
            provider_account_id: primary_provider.id.clone(),
            channel: "sms".to_owned(),
            identity_code: "sdkwork-primary-sign".to_owned(),
            display_name: Some("SDKWORK Primary Sign".to_owned()),
            from_email: None,
            from_name: None,
            reply_to: None,
            domain_name: None,
            sign_name: Some("SDKWORK".to_owned()),
            sender_id: None,
            country_code: Some("CN".to_owned()),
            idempotency_key: "idem-primary-sender-create".to_owned(),
            request_id: "req-primary-sender-create".to_owned(),
        })
        .await
        .expect("primary sender identity should be created");

    let mismatched_channel_sender = store
        .create_sender_identity(CreateMessagingSenderIdentityCommand {
            subject: subject(),
            provider_account_id: primary_provider.id.clone(),
            channel: "email".to_owned(),
            identity_code: "sdkwork-email-on-sms-account".to_owned(),
            display_name: Some("SDKWORK Email On SMS".to_owned()),
            from_email: Some("noreply@example.com".to_owned()),
            from_name: Some("SDKWORK".to_owned()),
            reply_to: None,
            domain_name: Some("example.com".to_owned()),
            sign_name: None,
            sender_id: None,
            country_code: None,
            idempotency_key: "idem-mismatched-channel-sender-create".to_owned(),
            request_id: "req-mismatched-channel-sender-create".to_owned(),
        })
        .await
        .expect_err("sender identity must require provider account channel support");
    assert!(mismatched_channel_sender
        .to_string()
        .contains("does not support channel email"));

    let sender_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM messaging_sender_identity WHERE identity_code = 'sdkwork-email-on-sms-account'",
    )
    .fetch_one(&pool)
    .await
    .expect("mismatched sender count should load");
    assert_eq!(0, sender_count);

    let backup_provider = store
        .create_provider_account(CreateMessagingProviderAccountCommand {
            subject: subject(),
            provider_code: "aliyun_sms".to_owned(),
            account_code: "aliyun-backup".to_owned(),
            account_name: "Aliyun Backup SMS".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: Some("verification".to_owned()),
            base_url: Some("https://dysmsapi.aliyuncs-backup.test".to_owned()),
            secret_ref: "vault://messaging/aliyun-backup".to_owned(),
            auth_type: Some("access_key".to_owned()),
            capability_schema: json!({ "supportsDeliveryReceipt": true }),
            idempotency_key: "idem-backup-provider-create".to_owned(),
            request_id: "req-backup-provider-create".to_owned(),
        })
        .await
        .expect("backup provider account should be created");

    let mismatched_sender = store
        .create_route_rule(CreateMessagingRouteRuleCommand {
            subject: subject(),
            rule_code: "login-sms-backup-with-primary-sender".to_owned(),
            scene_code: "login".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "verification".to_owned(),
            country_code: Some("*".to_owned()),
            locale: Some("*".to_owned()),
            user_segment: None,
            priority: Some(20),
            failover_policy: json!({ "mode": "ordered" }),
            targets: vec![MessagingRouteRuleTargetCommand {
                provider_account_id: backup_provider.id.clone(),
                sender_identity_id: Some(sender.id.clone()),
                template_binding_id: None,
                target_order: 1,
                weight: Some(100),
            }],
            idempotency_key: "idem-mismatched-sender-route-create".to_owned(),
            request_id: "req-mismatched-sender-route-create".to_owned(),
        })
        .await
        .expect_err("route target must require sender identity from the same account and channel");

    assert!(mismatched_sender.to_string().contains("sender identity"));

    let route_rule_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM messaging_route_rule WHERE rule_code = 'login-sms-backup-with-primary-sender'",
    )
    .fetch_one(&pool)
    .await
    .expect("route rule count should load");
    let route_target_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM messaging_route_rule_target t
        JOIN messaging_route_rule r
          ON r.id = t.route_rule_id
        WHERE r.rule_code = 'login-sms-backup-with-primary-sender'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("route target count should load");
    assert_eq!(0, route_rule_count);
    assert_eq!(0, route_target_count);
}

#[tokio::test]
async fn sqlite_admin_messaging_store_adds_delivery_capabilities_to_existing_provider_account() {
    let pool = create_pool().await;
    create_messaging_tables(&pool).await;
    seed_messaging_reference_data(&pool).await;

    let store = SqliteAdminMessagingStore::new(pool.clone());
    let transactional_account = store
        .create_provider_account(CreateMessagingProviderAccountCommand {
            subject: subject(),
            provider_code: "sendgrid".to_owned(),
            account_code: "sendgrid-primary".to_owned(),
            account_name: "SendGrid Primary".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: Some("transactional".to_owned()),
            base_url: Some("https://api.sendgrid.test".to_owned()),
            secret_ref: "vault://messaging/sendgrid-primary".to_owned(),
            auth_type: Some("bearer".to_owned()),
            capability_schema: json!({ "supportsDeliveryReceipt": true }),
            idempotency_key: "idem-sendgrid-transactional".to_owned(),
            request_id: "req-sendgrid-transactional".to_owned(),
        })
        .await
        .expect("transactional email provider account should be created");

    let marketing_capability = store
        .create_provider_account(CreateMessagingProviderAccountCommand {
            subject: subject(),
            provider_code: "sendgrid".to_owned(),
            account_code: "sendgrid-primary".to_owned(),
            account_name: "SendGrid Primary".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: Some("marketing".to_owned()),
            base_url: Some("https://api.sendgrid.test".to_owned()),
            secret_ref: "vault://messaging/sendgrid-primary".to_owned(),
            auth_type: Some("bearer".to_owned()),
            capability_schema: json!({
                "supportsBatchSend": true,
                "supportsWebhook": true
            }),
            idempotency_key: "idem-sendgrid-marketing".to_owned(),
            request_id: "req-sendgrid-marketing".to_owned(),
        })
        .await
        .expect("marketing capability should be added to existing provider account");

    assert_eq!(transactional_account.id, marketing_capability.id);

    let capability_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM messaging_provider_capability
        WHERE provider_account_id = ?1
          AND channel = 'email'
          AND delivery_purpose IN ('transactional', 'marketing')
          AND deleted_at IS NULL
        "#,
    )
    .bind(transactional_account.id.parse::<i64>().unwrap())
    .fetch_one(&pool)
    .await
    .expect("provider account capabilities should load");
    assert_eq!(2, capability_count);

    let provider_rows = store
        .list_provider_accounts(ListAdminMessagingRecordsQuery {
            provider_code: Some("sendgrid".to_owned()),
            ..list_query()
        })
        .await
        .expect("provider account capability rows should list");
    assert_eq!(2, provider_rows.total);
    assert_ne!(provider_rows.items[0]["id"], provider_rows.items[1]["id"]);
    assert_eq!(
        transactional_account.id,
        provider_rows.items[0]["providerAccountId"]
            .as_str()
            .expect("provider account id should be exposed")
    );
    let purposes = provider_rows
        .items
        .iter()
        .map(|item| item["deliveryPurpose"].as_str().unwrap_or_default())
        .collect::<std::collections::BTreeSet<_>>();
    assert_eq!(
        std::collections::BTreeSet::from(["marketing", "transactional"]),
        purposes
    );

    let marketing_sender = store
        .create_sender_identity(CreateMessagingSenderIdentityCommand {
            subject: subject(),
            provider_account_id: transactional_account.id.clone(),
            channel: "email".to_owned(),
            identity_code: "sendgrid-marketing-from".to_owned(),
            display_name: Some("SendGrid Marketing".to_owned()),
            from_email: Some("news@example.com".to_owned()),
            from_name: Some("SDKWORK".to_owned()),
            reply_to: Some("reply@example.com".to_owned()),
            domain_name: Some("example.com".to_owned()),
            sign_name: None,
            sender_id: None,
            country_code: None,
            idempotency_key: "idem-sendgrid-marketing-sender".to_owned(),
            request_id: "req-sendgrid-marketing-sender".to_owned(),
        })
        .await
        .expect("sender identity should use the shared email account");

    let marketing_route = store
        .create_route_rule(CreateMessagingRouteRuleCommand {
            subject: subject(),
            rule_code: "sendgrid-marketing-primary".to_owned(),
            scene_code: "campaign".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            country_code: Some("*".to_owned()),
            locale: Some("*".to_owned()),
            user_segment: Some("all".to_owned()),
            priority: Some(20),
            failover_policy: json!({ "mode": "ordered" }),
            targets: vec![MessagingRouteRuleTargetCommand {
                provider_account_id: transactional_account.id.clone(),
                sender_identity_id: Some(marketing_sender.id),
                template_binding_id: None,
                target_order: 1,
                weight: Some(100),
            }],
            idempotency_key: "idem-sendgrid-marketing-route".to_owned(),
            request_id: "req-sendgrid-marketing-route".to_owned(),
        })
        .await
        .expect("marketing route should accept the added provider account capability");
    assert_eq!("active", marketing_route.status);
}

#[tokio::test]
async fn sqlite_admin_messaging_store_sends_marketing_email_template_with_same_routing_model() {
    let pool = create_pool().await;
    create_messaging_tables(&pool).await;
    seed_messaging_reference_data(&pool).await;

    let store = SqliteAdminMessagingStore::new(pool.clone());
    let provider = store
        .create_provider_account(CreateMessagingProviderAccountCommand {
            subject: subject(),
            provider_code: "sendgrid".to_owned(),
            account_code: "sendgrid-marketing".to_owned(),
            account_name: "SendGrid Marketing".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: Some("marketing".to_owned()),
            base_url: Some("https://api.sendgrid.test".to_owned()),
            secret_ref: "vault://messaging/sendgrid-marketing".to_owned(),
            auth_type: Some("api_key".to_owned()),
            capability_schema: json!({
                "supportsTemplateSync": true,
                "supportsDeliveryReceipt": true,
                "supportsBatchSend": true,
                "supportsWebhook": true,
                "sandboxSupported": true
            }),
            idempotency_key: "idem-email-provider-create".to_owned(),
            request_id: "req-email-provider-create".to_owned(),
        })
        .await
        .expect("marketing email provider account should be created");

    let sender = store
        .create_sender_identity(CreateMessagingSenderIdentityCommand {
            subject: subject(),
            provider_account_id: provider.id.clone(),
            channel: "email".to_owned(),
            identity_code: "marketing-mailer".to_owned(),
            display_name: Some("SDKWORK Marketing".to_owned()),
            from_email: Some("marketing@example.com".to_owned()),
            from_name: Some("SDKWORK".to_owned()),
            reply_to: Some("support@example.com".to_owned()),
            domain_name: Some("example.com".to_owned()),
            sign_name: None,
            sender_id: None,
            country_code: Some("*".to_owned()),
            idempotency_key: "idem-email-sender-create".to_owned(),
            request_id: "req-email-sender-create".to_owned(),
        })
        .await
        .expect("marketing email sender should be created");

    let template = store
        .create_template(CreateMessagingTemplateCommand {
            subject: subject(),
            template_code: "PROMO_EMAIL_CAMPAIGN".to_owned(),
            scene_code: "campaign".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            category: "campaign".to_owned(),
            template_name: "Promo Email Campaign".to_owned(),
            subject_template: Some("Hi {{name}}, your offer is ready".to_owned()),
            body_template: "<p>{{name}}, use {{coupon}}</p>".to_owned(),
            content_format: Some("html".to_owned()),
            locale: Some("en-US".to_owned()),
            variable_schema: json!({
                "type": "object",
                "required": ["name", "coupon"],
                "properties": {
                    "name": { "type": "string" },
                    "coupon": { "type": "string" }
                }
            }),
            idempotency_key: "idem-email-template-create".to_owned(),
            request_id: "req-email-template-create".to_owned(),
        })
        .await
        .expect("marketing email template should be created");

    let version_id: i64 =
        sqlx::query_scalar("SELECT current_version_id FROM messaging_template WHERE id = ?1")
            .bind(template.id.parse::<i64>().unwrap())
            .fetch_one(&pool)
            .await
            .expect("current marketing template version should load");
    store
        .publish_template_version(PublishMessagingTemplateVersionCommand {
            subject: subject(),
            template_id: template.id.clone(),
            version_id: version_id.to_string(),
            request_id: "req-email-template-publish".to_owned(),
        })
        .await
        .expect("marketing email template version should publish");

    let route = store
        .create_route_rule(CreateMessagingRouteRuleCommand {
            subject: subject(),
            rule_code: "campaign-email-vip".to_owned(),
            scene_code: "campaign".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            country_code: Some("US".to_owned()),
            locale: Some("en-US".to_owned()),
            user_segment: Some("vip".to_owned()),
            priority: Some(20),
            failover_policy: json!({ "mode": "ordered" }),
            targets: vec![MessagingRouteRuleTargetCommand {
                provider_account_id: provider.id.clone(),
                sender_identity_id: Some(sender.id.clone()),
                template_binding_id: None,
                target_order: 1,
                weight: Some(100),
            }],
            idempotency_key: "idem-email-route-create".to_owned(),
            request_id: "req-email-route-create".to_owned(),
        })
        .await
        .expect("marketing email route should be created");

    let mismatched_route = store
        .create_route_rule(CreateMessagingRouteRuleCommand {
            subject: subject(),
            rule_code: "login-sms-with-email-provider".to_owned(),
            scene_code: "login".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "verification".to_owned(),
            country_code: Some("US".to_owned()),
            locale: Some("en-US".to_owned()),
            user_segment: None,
            priority: Some(30),
            failover_policy: json!({ "mode": "ordered" }),
            targets: vec![MessagingRouteRuleTargetCommand {
                provider_account_id: provider.id.clone(),
                sender_identity_id: Some(sender.id.clone()),
                template_binding_id: None,
                target_order: 1,
                weight: Some(100),
            }],
            idempotency_key: "idem-mismatched-route-create".to_owned(),
            request_id: "req-mismatched-route-create".to_owned(),
        })
        .await
        .expect_err("route target must require matching provider channel and delivery purpose");
    assert!(mismatched_route
        .to_string()
        .contains("does not support verification/sms"));

    let send = store
        .send_template(AdminMessagingTemplateSendCommand {
            subject: subject(),
            scene_code: "campaign".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            template_code: "PROMO_EMAIL_CAMPAIGN".to_owned(),
            country_code: Some("US".to_owned()),
            locale: Some("en-US".to_owned()),
            user_segment: Some("vip".to_owned()),
            target_masked: "m***@example.com".to_owned(),
            target_hash: "target-hash-marketing-email".to_owned(),
            dry_run: Some(false),
            variables: json!({ "name": "Ada", "coupon": "VIP2026" }),
            idempotency_key: "idem-template-send".to_owned(),
            request_id: "req-template-send".to_owned(),
        })
        .await
        .expect("marketing email template send should create request and attempt");

    assert_eq!("queued", send.delivery_status);
    assert_eq!(Some("sendgrid".to_owned()), send.provider_code);

    let persisted = sqlx::query(
        r#"
        SELECT delivery_purpose, scene_code, channel, template_version_id, template_variant_id,
               resolved_route_rule_id, resolved_sender_identity_id, request_payload_redacted
        FROM messaging_send_request
        WHERE request_id = ?1
        "#,
    )
    .bind("req-template-send")
    .fetch_one(&pool)
    .await
    .expect("marketing send request should persist normalized messaging dimensions");
    assert_eq!("marketing", persisted.get::<String, _>("delivery_purpose"));
    assert_eq!("campaign", persisted.get::<String, _>("scene_code"));
    assert_eq!("email", persisted.get::<String, _>("channel"));
    assert!(persisted
        .get::<Option<i64>, _>("template_version_id")
        .is_some());
    assert!(persisted
        .get::<Option<i64>, _>("template_variant_id")
        .is_some());
    assert_eq!(
        Some(route.id.parse::<i64>().unwrap()),
        persisted.get::<Option<i64>, _>("resolved_route_rule_id")
    );
    assert_eq!(
        Some(sender.id.parse::<i64>().unwrap()),
        persisted.get::<Option<i64>, _>("resolved_sender_identity_id")
    );
    let redacted_payload = persisted.get::<String, _>("request_payload_redacted");
    assert!(redacted_payload.contains("\"templateCode\":\"PROMO_EMAIL_CAMPAIGN\""));
    assert!(redacted_payload.contains("\"deliveryPurpose\":\"marketing\""));

    let missing_required_variable = store
        .send_template(AdminMessagingTemplateSendCommand {
            subject: subject(),
            scene_code: "campaign".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            template_code: "PROMO_EMAIL_CAMPAIGN".to_owned(),
            country_code: Some("US".to_owned()),
            locale: Some("en-US".to_owned()),
            user_segment: Some("vip".to_owned()),
            target_masked: "m***@example.com".to_owned(),
            target_hash: "target-hash-missing-variable".to_owned(),
            dry_run: Some(false),
            variables: json!({ "name": "Ada" }),
            idempotency_key: "idem-template-send-missing-variable".to_owned(),
            request_id: "req-template-send-missing-variable".to_owned(),
        })
        .await
        .expect_err("template send must reject missing required variables before enqueue");
    assert!(missing_required_variable
        .to_string()
        .contains("missing required template variable coupon"));

    let missing_variable_request_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM messaging_send_request WHERE request_id = 'req-template-send-missing-variable'",
    )
    .fetch_one(&pool)
    .await
    .expect("missing variable request count should load");
    let missing_variable_attempt_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM messaging_send_attempt a
        JOIN messaging_send_request r
          ON r.id = a.send_request_id
        WHERE r.request_id = 'req-template-send-missing-variable'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("missing variable attempt count should load");
    assert_eq!(0, missing_variable_request_count);
    assert_eq!(0, missing_variable_attempt_count);

    let suppressed = store
        .send_template(AdminMessagingTemplateSendCommand {
            subject: subject(),
            scene_code: "campaign".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            template_code: "PROMO_EMAIL_CAMPAIGN".to_owned(),
            country_code: Some("US".to_owned()),
            locale: Some("en-US".to_owned()),
            user_segment: Some("vip".to_owned()),
            target_masked: "u***@example.com".to_owned(),
            target_hash: "email-target-hash".to_owned(),
            dry_run: Some(false),
            variables: json!({ "name": "Grace", "coupon": "VIP2026" }),
            idempotency_key: "idem-template-send-suppressed".to_owned(),
            request_id: "req-template-send-suppressed".to_owned(),
        })
        .await
        .expect("suppressed marketing email should be recorded without provider attempt");

    assert_eq!("suppressed", suppressed.delivery_status);
    assert_eq!(Some("sendgrid".to_owned()), suppressed.provider_code);

    let suppressed_request = sqlx::query(
        r#"
        SELECT delivery_status, resolved_provider_account_id, resolved_sender_identity_id
        FROM messaging_send_request
        WHERE request_id = ?1
        "#,
    )
    .bind("req-template-send-suppressed")
    .fetch_one(&pool)
    .await
    .expect("suppressed send request should persist normalized route evidence");
    assert_eq!(
        "suppressed",
        suppressed_request.get::<String, _>("delivery_status")
    );
    assert_eq!(
        Some(provider.id.parse::<i64>().unwrap()),
        suppressed_request.get::<Option<i64>, _>("resolved_provider_account_id")
    );
    assert_eq!(
        Some(sender.id.parse::<i64>().unwrap()),
        suppressed_request.get::<Option<i64>, _>("resolved_sender_identity_id")
    );

    let suppressed_attempt_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM messaging_send_attempt a
        JOIN messaging_send_request r ON r.id = a.send_request_id
        WHERE r.request_id = ?1
        "#,
    )
    .bind("req-template-send-suppressed")
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0, suppressed_attempt_count);

    let suppressed_event = sqlx::query(
        r#"
        SELECT e.event_type, e.provider_code, e.payload_redacted
        FROM messaging_delivery_event e
        JOIN messaging_send_request r ON r.id = e.send_request_id
        WHERE r.request_id = ?1
        "#,
    )
    .bind("req-template-send-suppressed")
    .fetch_one(&pool)
    .await
    .expect("suppressed send should emit policy delivery event");
    assert_eq!(
        "suppressed",
        suppressed_event.get::<String, _>("event_type")
    );
    assert_eq!(
        "sendgrid",
        suppressed_event.get::<String, _>("provider_code")
    );
    assert!(suppressed_event
        .get::<String, _>("payload_redacted")
        .contains("\"reasonCode\":\"hard_bounce\""));

    let suppression_reject_count: i64 = sqlx::query_scalar(
        r#"
        SELECT reject_count
        FROM messaging_rate_limit_bucket
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND scene_code = 'campaign'
          AND channel = 'email'
          AND target_hash = 'email-target-hash'
          AND ip_hash = '*'
          AND device_hash = '*'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("suppressed send should increment governance rejection bucket");
    assert_eq!(1, suppression_reject_count);

    store
        .create_suppression(CreateMessagingSuppressionCommand {
            subject: subject(),
            channel: "email".to_owned(),
            target_masked: "v***@example.com".to_owned(),
            target_hash: "user-scoped-marketing-target-hash".to_owned(),
            reason_code: "unsubscribe".to_owned(),
            scope_type: "user".to_owned(),
            scope_id: "user-123".to_owned(),
            starts_at: "2026-05-01T00:00:00Z".to_owned(),
            ends_at: None,
            source: "operator".to_owned(),
            note: Some("user-level marketing opt-out".to_owned()),
            idempotency_key: "idem-user-suppression".to_owned(),
            request_id: "req-user-suppression".to_owned(),
        })
        .await
        .expect("user-scoped suppression should be maintained");

    let user_scoped_suppressed = store
        .send_template(AdminMessagingTemplateSendCommand {
            subject: subject(),
            scene_code: "campaign".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            template_code: "PROMO_EMAIL_CAMPAIGN".to_owned(),
            country_code: Some("US".to_owned()),
            locale: Some("en-US".to_owned()),
            user_segment: Some("vip".to_owned()),
            target_masked: "v***@example.com".to_owned(),
            target_hash: "user-scoped-marketing-target-hash".to_owned(),
            dry_run: Some(false),
            variables: json!({ "name": "Vivian", "coupon": "VIP2026" }),
            idempotency_key: "idem-user-scoped-suppressed-send".to_owned(),
            request_id: "req-user-scoped-suppressed-send".to_owned(),
        })
        .await
        .expect("target-level user-scoped suppression should block marketing send");
    assert_eq!("suppressed", user_scoped_suppressed.delivery_status);

    let route_unmatched = store
        .send_template(AdminMessagingTemplateSendCommand {
            subject: subject(),
            scene_code: "campaign".to_owned(),
            channel: "email".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            template_code: "PROMO_EMAIL_CAMPAIGN".to_owned(),
            country_code: Some("CA".to_owned()),
            locale: Some("en-US".to_owned()),
            user_segment: Some("standard".to_owned()),
            target_masked: "n***@example.com".to_owned(),
            target_hash: "target-hash-no-route".to_owned(),
            dry_run: Some(false),
            variables: json!({ "name": "No Route", "coupon": "VIP2026" }),
            idempotency_key: "idem-template-send-no-route".to_owned(),
            request_id: "req-template-send-no-route".to_owned(),
        })
        .await
        .expect("template send without a route should be recorded as unmatched");
    assert_eq!("route_unmatched", route_unmatched.delivery_status);
    assert_eq!(None, route_unmatched.provider_code);

    let unmatched_attempt_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM messaging_send_attempt a
        JOIN messaging_send_request r ON r.id = a.send_request_id
        WHERE r.request_id = ?1
        "#,
    )
    .bind("req-template-send-no-route")
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0, unmatched_attempt_count);

    let unmatched_event: String = sqlx::query_scalar(
        r#"
        SELECT e.event_type
        FROM messaging_delivery_event e
        JOIN messaging_send_request r ON r.id = e.send_request_id
        WHERE r.request_id = ?1
        "#,
    )
    .bind("req-template-send-no-route")
    .fetch_one(&pool)
    .await
    .expect("unmatched route send should emit a delivery event");
    assert_eq!("route_unmatched", unmatched_event);
}

#[tokio::test]
async fn sqlite_admin_messaging_store_sends_marketing_sms_template_with_same_routing_model() {
    let pool = create_pool().await;
    create_messaging_tables(&pool).await;
    seed_messaging_reference_data(&pool).await;

    let store = SqliteAdminMessagingStore::new(pool.clone());
    let provider = store
        .create_provider_account(CreateMessagingProviderAccountCommand {
            subject: subject(),
            provider_code: "aliyun_sms".to_owned(),
            account_code: "aliyun-marketing-sms".to_owned(),
            account_name: "Aliyun Marketing SMS".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: Some("marketing".to_owned()),
            base_url: Some("https://dysmsapi.aliyuncs.test".to_owned()),
            secret_ref: "vault://messaging/aliyun-marketing-sms".to_owned(),
            auth_type: Some("access_key".to_owned()),
            capability_schema: json!({
                "supportsTemplateSync": true,
                "supportsDeliveryReceipt": true,
                "supportsBatchSend": true
            }),
            idempotency_key: "idem-sms-marketing-provider-create".to_owned(),
            request_id: "req-sms-marketing-provider-create".to_owned(),
        })
        .await
        .expect("marketing sms provider account should be created");

    let sender = store
        .create_sender_identity(CreateMessagingSenderIdentityCommand {
            subject: subject(),
            provider_account_id: provider.id.clone(),
            channel: "sms".to_owned(),
            identity_code: "marketing-sms-sign".to_owned(),
            display_name: Some("SDKWORK Marketing SMS".to_owned()),
            from_email: None,
            from_name: None,
            reply_to: None,
            domain_name: None,
            sign_name: Some("SDKWORK".to_owned()),
            sender_id: None,
            country_code: Some("CN".to_owned()),
            idempotency_key: "idem-sms-marketing-sender-create".to_owned(),
            request_id: "req-sms-marketing-sender-create".to_owned(),
        })
        .await
        .expect("marketing sms sender identity should be created");

    let template = store
        .create_template(CreateMessagingTemplateCommand {
            subject: subject(),
            template_code: "PROMO_SMS_CAMPAIGN".to_owned(),
            scene_code: "sms-campaign".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            category: "campaign".to_owned(),
            template_name: "Promo SMS Campaign".to_owned(),
            subject_template: None,
            body_template: "Hi {{name}}, use {{coupon}}.".to_owned(),
            content_format: Some("text".to_owned()),
            locale: Some("zh-CN".to_owned()),
            variable_schema: json!({
                "type": "object",
                "required": ["name", "coupon"],
                "properties": {
                    "name": { "type": "string" },
                    "coupon": { "type": "string" }
                }
            }),
            idempotency_key: "idem-sms-marketing-template-create".to_owned(),
            request_id: "req-sms-marketing-template-create".to_owned(),
        })
        .await
        .expect("marketing sms template should be created");

    let version_id: i64 =
        sqlx::query_scalar("SELECT current_version_id FROM messaging_template WHERE id = ?1")
            .bind(template.id.parse::<i64>().unwrap())
            .fetch_one(&pool)
            .await
            .expect("current sms marketing template version should load");
    store
        .publish_template_version(PublishMessagingTemplateVersionCommand {
            subject: subject(),
            template_id: template.id,
            version_id: version_id.to_string(),
            request_id: "req-sms-marketing-template-publish".to_owned(),
        })
        .await
        .expect("marketing sms template version should publish");

    let route = store
        .create_route_rule(CreateMessagingRouteRuleCommand {
            subject: subject(),
            rule_code: "sms-campaign-cn".to_owned(),
            scene_code: "sms-campaign".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            country_code: Some("CN".to_owned()),
            locale: Some("zh-CN".to_owned()),
            user_segment: Some("vip".to_owned()),
            priority: Some(20),
            failover_policy: json!({ "mode": "ordered" }),
            targets: vec![MessagingRouteRuleTargetCommand {
                provider_account_id: provider.id.clone(),
                sender_identity_id: Some(sender.id.clone()),
                template_binding_id: None,
                target_order: 1,
                weight: Some(100),
            }],
            idempotency_key: "idem-sms-marketing-route-create".to_owned(),
            request_id: "req-sms-marketing-route-create".to_owned(),
        })
        .await
        .expect("marketing sms route should be created");

    let send = store
        .send_template(AdminMessagingTemplateSendCommand {
            subject: subject(),
            scene_code: "sms-campaign".to_owned(),
            channel: "sms".to_owned(),
            delivery_purpose: "marketing".to_owned(),
            template_code: "PROMO_SMS_CAMPAIGN".to_owned(),
            country_code: Some("CN".to_owned()),
            locale: Some("zh-CN".to_owned()),
            user_segment: Some("vip".to_owned()),
            target_masked: "+86******6688".to_owned(),
            target_hash: "target-hash-marketing-sms".to_owned(),
            dry_run: Some(false),
            variables: json!({ "name": "Lin", "coupon": "SMS2026" }),
            idempotency_key: "idem-sms-template-send".to_owned(),
            request_id: "req-sms-template-send".to_owned(),
        })
        .await
        .expect("marketing sms template send should create request and attempt");

    assert_eq!("queued", send.delivery_status);
    assert_eq!(Some("aliyun_sms".to_owned()), send.provider_code);

    let persisted = sqlx::query(
        r#"
        SELECT delivery_purpose, scene_code, channel, resolved_route_rule_id,
               resolved_provider_account_id, resolved_sender_identity_id
        FROM messaging_send_request
        WHERE request_id = ?1
        "#,
    )
    .bind("req-sms-template-send")
    .fetch_one(&pool)
    .await
    .expect("marketing sms send request should persist normalized route evidence");
    assert_eq!("marketing", persisted.get::<String, _>("delivery_purpose"));
    assert_eq!("sms-campaign", persisted.get::<String, _>("scene_code"));
    assert_eq!("sms", persisted.get::<String, _>("channel"));
    assert_eq!(
        Some(route.id.parse::<i64>().unwrap()),
        persisted.get::<Option<i64>, _>("resolved_route_rule_id")
    );
    assert_eq!(
        Some(provider.id.parse::<i64>().unwrap()),
        persisted.get::<Option<i64>, _>("resolved_provider_account_id")
    );
    assert_eq!(
        Some(sender.id.parse::<i64>().unwrap()),
        persisted.get::<Option<i64>, _>("resolved_sender_identity_id")
    );
}

#[tokio::test]
async fn sqlite_admin_messaging_store_keeps_verification_policy_in_iam_and_lists_operational_guards(
) {
    let pool = create_pool().await;
    create_messaging_tables(&pool).await;
    seed_messaging_reference_data(&pool).await;

    let store = SqliteAdminMessagingStore::new(pool.clone());

    let suppressions = store
        .list_suppressions(ListAdminMessagingRecordsQuery {
            channel: Some("email".to_owned()),
            target_hash: Some("email-target-hash".to_owned()),
            ..list_query()
        })
        .await
        .expect("suppressions should list");
    assert_eq!(1, suppressions.total);
    assert_eq!("hard_bounce", suppressions.items[0]["reasonCode"]);
    assert_eq!("u***@example.com", suppressions.items[0]["targetMasked"]);
    assert_eq!("tenant", suppressions.items[0]["scopeType"]);
    assert!(suppressions.items[0]["startsAt"]
        .as_str()
        .unwrap()
        .contains("2026-05-01"));

    let created_suppression = store
        .create_suppression(CreateMessagingSuppressionCommand {
            subject: subject(),
            channel: "email".to_owned(),
            target_masked: "m***@example.com".to_owned(),
            target_hash: "manual-email-target-hash".to_owned(),
            reason_code: "unsubscribe".to_owned(),
            scope_type: "tenant".to_owned(),
            scope_id: "*".to_owned(),
            starts_at: "2026-05-25T00:00:00Z".to_owned(),
            ends_at: Some("2026-06-25T00:00:00Z".to_owned()),
            source: "operator".to_owned(),
            note: Some("manual suppression".to_owned()),
            idempotency_key: "idem-suppression-create".to_owned(),
            request_id: "req-suppression-create".to_owned(),
        })
        .await
        .expect("manual suppression should be created");
    assert_eq!("active", created_suppression.status);

    let created_suppression_retry = store
        .create_suppression(CreateMessagingSuppressionCommand {
            subject: subject(),
            channel: "email".to_owned(),
            target_masked: "m***@example.com".to_owned(),
            target_hash: "manual-email-target-hash".to_owned(),
            reason_code: "unsubscribe".to_owned(),
            scope_type: "tenant".to_owned(),
            scope_id: "*".to_owned(),
            starts_at: "2026-05-25T00:00:00Z".to_owned(),
            ends_at: Some("2026-06-25T00:00:00Z".to_owned()),
            source: "operator".to_owned(),
            note: Some("manual suppression".to_owned()),
            idempotency_key: "idem-suppression-create".to_owned(),
            request_id: "req-suppression-create".to_owned(),
        })
        .await
        .expect("manual suppression retry should be idempotent");
    assert_eq!(created_suppression.id, created_suppression_retry.id);

    let manual_suppressions = store
        .list_suppressions(ListAdminMessagingRecordsQuery {
            channel: Some("email".to_owned()),
            target_hash: Some("manual-email-target-hash".to_owned()),
            ..list_query()
        })
        .await
        .expect("manual suppression should list");
    assert_eq!(1, manual_suppressions.total);
    assert_eq!("unsubscribe", manual_suppressions.items[0]["reasonCode"]);

    let suppression_audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ops_audit_log WHERE action = 'messaging.suppression.create'",
    )
    .fetch_one(&pool)
    .await
    .expect("suppression create audit should load");
    assert_eq!(1, suppression_audit_count);

    let rate_limits = store
        .list_rate_limit_buckets(ListAdminMessagingRecordsQuery {
            scene_code: Some("login".to_owned()),
            channel: Some("sms".to_owned()),
            target_hash: Some("target-hash-login".to_owned()),
            ..list_query()
        })
        .await
        .expect("rate limit buckets should list");
    assert_eq!(1, rate_limits.total);
    assert_eq!(3, rate_limits.items[0]["sendCount"]);
    assert_eq!(1, rate_limits.items[0]["rejectCount"]);
    assert!(rate_limits.items[0]["windowStart"]
        .as_str()
        .unwrap()
        .contains("2026-05-25"));
    assert_eq!(3600, rate_limits.items[0]["windowSeconds"]);

    let policies_before = store
        .list_verification_policies(ListAdminMessagingRecordsQuery {
            scene_code: Some("login".to_owned()),
            ..list_query()
        })
        .await
        .expect("verification policies should list from IAM");
    assert_eq!(1, policies_before.total);
    assert_eq!("Login", policies_before.items[0]["sceneName"]);
    assert_eq!("LOGIN_SMS_OTP", policies_before.items[0]["templateCode"]);

    let updated = store
        .update_verification_policy(UpdateVerificationPolicyCommand {
            subject: subject(),
            policy_id: "login".to_owned(),
            allowed_channels: vec!["sms".to_owned(), "email".to_owned()],
            default_channel: Some("email".to_owned()),
            code_length: 8,
            ttl_seconds: 600,
            resend_interval_seconds: Some(90),
            max_send_per_hour: Some(8),
            max_verify_attempts: 4,
            template_code: "LOGIN_EMAIL_OTP".to_owned(),
            risk_policy: json!({ "captchaAfterFailures": 2 }),
            request_id: "req-policy-update".to_owned(),
        })
        .await
        .expect("verification policy should update in IAM");
    assert_eq!("login", updated.id);
    assert_eq!("active", updated.status);

    let policy_row = sqlx::query(
        r#"
        SELECT allowed_channels, default_channel, code_length, ttl_seconds,
               resend_interval_seconds, max_send_per_hour, max_verify_attempts,
               template_code, risk_policy
        FROM iam_verification_scene_policy
        WHERE scene_code = 'login'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("updated IAM verification policy should load");
    assert_eq!(
        "[\"sms\",\"email\"]",
        policy_row.get::<String, _>("allowed_channels")
    );
    assert_eq!("email", policy_row.get::<String, _>("default_channel"));
    assert_eq!(8_i64, policy_row.get::<i64, _>("code_length"));
    assert_eq!(600_i64, policy_row.get::<i64, _>("ttl_seconds"));
    assert_eq!(90_i64, policy_row.get::<i64, _>("resend_interval_seconds"));
    assert_eq!(8_i64, policy_row.get::<i64, _>("max_send_per_hour"));
    assert_eq!(4_i64, policy_row.get::<i64, _>("max_verify_attempts"));
    assert_eq!(
        "LOGIN_EMAIL_OTP",
        policy_row.get::<String, _>("template_code")
    );
    assert_eq!(
        "{\"captchaAfterFailures\":2}",
        policy_row.get::<String, _>("risk_policy")
    );

    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ops_audit_log WHERE action = 'messaging.verification_policy.update'",
    )
    .fetch_one(&pool)
    .await
    .expect("policy update audit should load");
    assert_eq!(1, audit_count);
}

async fn create_pool() -> sqlx::SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

fn subject() -> AdminMessagingSubject {
    AdminMessagingSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

fn list_query() -> ListAdminMessagingRecordsQuery {
    ListAdminMessagingRecordsQuery {
        subject: subject(),
        page_no: 1,
        page_size: 20,
        offset: 0,
        q: None,
        status: None,
        channel: None,
        provider_code: None,
        scene_code: None,
        target_hash: None,
        reason_code: None,
        ip_hash: None,
        device_hash: None,
    }
}

async fn create_messaging_tables(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE integration_provider (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            provider_code TEXT NOT NULL,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE integration_provider_account (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            provider_id INTEGER,
            provider_code TEXT NOT NULL,
            account_code TEXT NOT NULL,
            account_name TEXT NOT NULL,
            auth_type INTEGER,
            base_url TEXT,
            auth_config TEXT,
            secret_ref TEXT
        )
        "#,
        r#"
        CREATE TABLE messaging_provider_capability (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            provider_code TEXT NOT NULL,
            provider_account_id INTEGER NOT NULL,
            channel TEXT NOT NULL,
            delivery_purpose TEXT NOT NULL,
            capability_schema TEXT NOT NULL DEFAULT '{}',
            supports_template_sync INTEGER NOT NULL DEFAULT 0,
            supports_delivery_receipt INTEGER NOT NULL DEFAULT 0,
            supports_test_send INTEGER NOT NULL DEFAULT 0,
            supports_batch_send INTEGER NOT NULL DEFAULT 0,
            supports_webhook INTEGER NOT NULL DEFAULT 0,
            sandbox_supported INTEGER NOT NULL DEFAULT 0,
            health_status TEXT NOT NULL DEFAULT 'unknown'
        )
        "#,
        r#"
        CREATE TABLE messaging_sender_identity (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            provider_account_id INTEGER NOT NULL,
            provider_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            identity_code TEXT NOT NULL,
            display_name TEXT,
            from_email TEXT,
            from_name TEXT,
            reply_to TEXT,
            domain_name TEXT,
            sign_name TEXT,
            sender_id TEXT,
            country_code TEXT,
            approval_status TEXT NOT NULL DEFAULT 'draft'
        )
        "#,
        r#"
        CREATE TABLE messaging_template (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            template_code TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            delivery_purpose TEXT NOT NULL,
            category TEXT NOT NULL,
            template_name TEXT NOT NULL,
            current_version_id INTEGER,
            publish_status TEXT NOT NULL DEFAULT 'draft'
        )
        "#,
        r#"
        CREATE TABLE messaging_template_version (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            template_id INTEGER NOT NULL,
            version_no INTEGER NOT NULL,
            subject_template TEXT,
            text_template TEXT,
            html_template TEXT,
            variable_schema TEXT NOT NULL DEFAULT '{}',
            content_hash TEXT NOT NULL,
            review_status TEXT NOT NULL DEFAULT 'draft',
            published_at TEXT
        )
        "#,
        r#"
        CREATE TABLE messaging_template_variant (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            template_version_id INTEGER NOT NULL,
            channel TEXT NOT NULL,
            locale TEXT NOT NULL,
            content_format TEXT NOT NULL,
            body_template TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE messaging_route_rule (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            rule_code TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            delivery_purpose TEXT NOT NULL,
            country_code TEXT NOT NULL DEFAULT '*',
            locale TEXT NOT NULL DEFAULT '*',
            user_segment TEXT NOT NULL DEFAULT '*',
            priority INTEGER NOT NULL DEFAULT 100,
            failover_policy TEXT NOT NULL DEFAULT '{}'
        )
        "#,
        r#"
        CREATE TABLE messaging_route_rule_target (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            route_rule_id INTEGER NOT NULL,
            provider_account_id INTEGER NOT NULL,
            provider_code TEXT NOT NULL,
            sender_identity_id INTEGER,
            template_binding_id INTEGER,
            target_order INTEGER NOT NULL DEFAULT 1,
            weight INTEGER NOT NULL DEFAULT 100
        )
        "#,
        r#"
        CREATE TABLE messaging_send_request (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            delivery_purpose TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_hash TEXT NOT NULL,
            target_masked TEXT,
            template_version_id INTEGER,
            template_variant_id INTEGER,
            resolved_route_rule_id INTEGER,
            resolved_provider_account_id INTEGER,
            resolved_sender_identity_id INTEGER,
            render_hash TEXT NOT NULL,
            request_payload_redacted TEXT NOT NULL DEFAULT '{}',
            dry_run INTEGER NOT NULL DEFAULT 0,
            delivery_status TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE messaging_send_attempt (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            send_request_id INTEGER NOT NULL,
            attempt_no INTEGER NOT NULL,
            provider_code TEXT NOT NULL,
            provider_account_id INTEGER NOT NULL,
            provider_status TEXT,
            attempted_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE messaging_delivery_event (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            request_id TEXT,
            payload_hash TEXT NOT NULL,
            send_request_id INTEGER NOT NULL,
            send_attempt_id INTEGER,
            provider_code TEXT NOT NULL,
            provider_event_id TEXT NOT NULL,
            provider_message_id TEXT,
            event_type TEXT NOT NULL,
            event_at TEXT NOT NULL,
            payload_redacted TEXT NOT NULL DEFAULT '{}'
        )
        "#,
        r#"
        CREATE TABLE messaging_suppression (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            channel TEXT NOT NULL,
            target_hash TEXT NOT NULL,
            target_masked TEXT,
            reason_code TEXT NOT NULL,
            scope_type TEXT NOT NULL DEFAULT 'tenant',
            scope_id TEXT NOT NULL DEFAULT '*',
            starts_at TEXT NOT NULL,
            ends_at TEXT,
            source TEXT NOT NULL,
            note TEXT
        )
        "#,
        r#"
        CREATE TABLE messaging_rate_limit_bucket (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            scene_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            target_hash TEXT NOT NULL,
            ip_hash TEXT NOT NULL,
            device_hash TEXT NOT NULL,
            window_start TEXT NOT NULL,
            window_seconds INTEGER NOT NULL,
            send_count INTEGER NOT NULL DEFAULT 0,
            verify_count INTEGER NOT NULL DEFAULT 0,
            reject_count INTEGER NOT NULL DEFAULT 0,
            last_event_at TEXT
        )
        "#,
        r#"
        CREATE TABLE iam_verification_scene_policy (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            scene_code TEXT NOT NULL,
            scene_name TEXT,
            allowed_channels TEXT NOT NULL DEFAULT '[]',
            default_channel TEXT,
            code_length INTEGER NOT NULL DEFAULT 6,
            ttl_seconds INTEGER NOT NULL DEFAULT 300,
            resend_interval_seconds INTEGER NOT NULL DEFAULT 60,
            max_send_per_hour INTEGER NOT NULL DEFAULT 5,
            max_verify_attempts INTEGER NOT NULL DEFAULT 5,
            template_code TEXT NOT NULL,
            risk_policy TEXT NOT NULL DEFAULT '{}'
        )
        "#,
        r#"
        CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT,
            operator_id INTEGER,
            operator_type INTEGER,
            action TEXT,
            target_type INTEGER,
            target_id INTEGER,
            target_uuid TEXT,
            created_at TEXT NOT NULL
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_messaging_reference_data(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO integration_provider (id, uuid, provider_code)
        VALUES
            (1, 'provider-aliyun-sms', 'aliyun_sms'),
            (2, 'provider-sendgrid', 'sendgrid')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO messaging_suppression
            (id, uuid, tenant_id, organization_id, status, channel, target_hash, target_masked, reason_code, starts_at, source)
        VALUES
            (1001, 'suppression-email', 100001, 0, 1, 'email', 'email-target-hash', 'u***@example.com', 'hard_bounce', '2026-05-01 00:00:00', 'provider_webhook'),
            (1002, 'suppression-other-tenant', 11, 20, 1, 'email', 'email-target-hash', 'leak@example.com', 'hard_bounce', '2026-05-01 00:00:00', 'provider_webhook')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO messaging_rate_limit_bucket
            (id, uuid, tenant_id, organization_id, status, scene_code, channel, target_hash, ip_hash, device_hash, window_start, window_seconds, send_count, verify_count, reject_count)
        VALUES
            (2001, 'bucket-login-sms', 100001, 0, 1, 'login', 'sms', 'target-hash-login', 'ip-hash', 'device-hash', '2026-05-25 10:00:00', 3600, 3, 2, 1),
            (2002, 'bucket-register-sms', 100001, 0, 1, 'register', 'sms', 'target-hash-register', 'ip-hash', 'device-hash', '2026-05-25 10:00:00', 3600, 7, 0, 3)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO iam_verification_scene_policy
            (id, uuid, tenant_id, organization_id, status, scene_code, scene_name, allowed_channels, default_channel, code_length, ttl_seconds, resend_interval_seconds, max_send_per_hour, max_verify_attempts, template_code, risk_policy)
        VALUES
            (3001, 'policy-login', 100001, 0, 1, 'login', 'Login', '["sms"]', 'sms', 6, 300, 60, 5, 5, 'LOGIN_SMS_OTP', '{}'),
            (3002, 'policy-other-tenant', 11, 20, 1, 'login', 'Login Leak', '["email"]', 'email', 6, 300, 60, 5, 5, 'LEAK', '{}')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}
