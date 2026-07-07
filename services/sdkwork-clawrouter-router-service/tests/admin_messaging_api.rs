mod common;

use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminMessagingCollection, AdminMessagingCommandFuture, AdminMessagingJsonRecord,
    AdminMessagingMutationItem, AdminMessagingRouteSimulationCommand,
    AdminMessagingRouteSimulationItem, AdminMessagingStore, AdminMessagingTemplateSendCommand,
    AdminMessagingTestSendCommand, AdminMessagingTestSendItem,
    CreateMessagingProviderAccountCommand, CreateMessagingRouteRuleCommand,
    CreateMessagingSenderIdentityCommand, CreateMessagingSuppressionCommand,
    CreateMessagingTemplateCommand, ListAdminMessagingRecordsQuery,
    PublishMessagingTemplateVersionCommand, UpdateVerificationPolicyCommand,
};
use serde_json::{json, Map, Value};
use tower::ServiceExt;

const ADMIN_MESSAGING_ACTION_REQUEST_ID: &str = "33333333-3333-4333-8444-555555555555";
const ADMIN_MESSAGING_WRITE_REQUEST_ID: &str = "44444444-4444-4333-8444-555555555555";

#[tokio::test]
async fn admin_messaging_route_exposes_delivery_management_center() {
    let router = sdkwork_clawrouter_router_service::api::admin_messaging_router_with_store(
        Arc::new(TestAdminMessagingStore),
    );

    for (path, expected_id) in [
        (
            "/backend/v3/api/messaging/provider_accounts?page=2&page_size=25&status=active&channel=sms&provider_code=aliyun&q=main",
            "provider-account-1",
        ),
        (
            "/backend/v3/api/messaging/sender_identities",
            "sender-identity-1",
        ),
        ("/backend/v3/api/messaging/templates", "template-1"),
        ("/backend/v3/api/messaging/route_rules", "route-rule-1"),
        (
            "/backend/v3/api/messaging/send_requests?scene_code=login&target_hash=target-1",
            "send-request-1",
        ),
        (
            "/backend/v3/api/messaging/suppressions?reason_code=bounced",
            "suppression-1",
        ),
        (
            "/backend/v3/api/messaging/rate_limit_buckets?ip_hash=ip-1&device_hash=device-1",
            "rate-limit-1",
        ),
        (
            "/backend/v3/api/messaging/verification_policies",
            "verification-policy-1",
        ),
    ] {
        let payload = request_json(router.clone(), trusted_request("GET", path)).await;
        assert_eq!(0, payload["code"], "{path}");
        assert_eq!(expected_id, payload["data"]["items"][0]["id"], "{path}");
        assert_eq!(1, payload["data"]["total"], "{path}");
        assert!(payload["data"]["pageSize"].as_i64().unwrap() >= 1, "{path}");
    }
}

#[tokio::test]
async fn admin_messaging_route_exposes_provider_sender_template_and_route_writes() {
    let router = sdkwork_clawrouter_router_service::api::admin_messaging_router_with_store(
        Arc::new(TestAdminMessagingStore),
    );

    let provider = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/provider_accounts",
            r#"{"providerCode":"aliyun","accountCode":"primary-sms","accountName":"Primary SMS","channel":"sms","deliveryPurpose":"verification","baseUrl":"https://dysmsapi.aliyuncs.com","credential":{"secretRef":"secret://messaging/aliyun-primary","authType":"access_key"},"capabilitySchema":{"supportsTemplateSync":true}}"#,
        ),
    )
    .await;
    assert_eq!(0, provider["code"].as_i64().unwrap());
    assert_eq!("provider-account-created", provider["data"]["id"]);
    assert_eq!("active", provider["data"]["status"]);

    let sender = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/sender_identities",
            r#"{"providerAccountId":"101","channel":"email","identityCode":"no-reply","displayName":"No Reply","fromEmail":"noreply@example.com","fromName":"Example","replyTo":"support@example.com","domainName":"example.com"}"#,
        ),
    )
    .await;
    assert_eq!(0, sender["code"].as_i64().unwrap());
    assert_eq!("sender-created", sender["data"]["id"]);

    let template = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/templates",
            r#"{"templateCode":"login-code","sceneCode":"login","channel":"sms","deliveryPurpose":"verification","category":"otp","templateName":"Login Code","subjectTemplate":"Your code","bodyTemplate":"Code {{code}}","contentFormat":"text","locale":"zh-CN","variableSchema":{"code":{"type":"string"}}}"#,
        ),
    )
    .await;
    assert_eq!(0, template["code"].as_i64().unwrap());
    assert_eq!("template-created", template["data"]["id"]);

    let published = request_json(
        router.clone(),
        trusted_empty_request(
            "POST",
            "/backend/v3/api/messaging/templates/201/versions/301/publish",
        ),
    )
    .await;
    assert_eq!(0, published["code"].as_i64().unwrap());
    assert_eq!("301", published["data"]["id"]);
    assert_eq!("published", published["data"]["status"]);

    let route_rule = request_json(
        router,
        trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/route_rules",
            r#"{"ruleCode":"login-sms-primary","sceneCode":"login","channel":"sms","deliveryPurpose":"verification","countryCode":"CN","locale":"zh-CN","userSegment":"default","priority":10,"failoverPolicy":{"mode":"ordered"},"targets":[{"providerAccountId":"101","senderIdentityId":"501","templateBindingId":"701","targetOrder":1,"weight":100}]}"#,
        ),
    )
    .await;
    assert_eq!(0, route_rule["code"].as_i64().unwrap());
    assert_eq!("route-rule-created", route_rule["data"]["id"]);
}

#[tokio::test]
async fn admin_messaging_route_exposes_diagnostics_and_verification_policy_actions() {
    let router = sdkwork_clawrouter_router_service::api::admin_messaging_router_with_store(
        Arc::new(TestAdminMessagingStore),
    );

    let simulation = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/diagnostics/route_simulation",
            r#"{"sceneCode":"login","channel":"sms","deliveryPurpose":"verification","countryCode":"CN","locale":"zh-CN","userSegment":"default"}"#,
        ),
    )
    .await;
    assert_eq!(0, simulation["code"].as_i64().unwrap());
    assert_eq!(true, simulation["data"]["matched"]);
    assert_eq!("route-rule-1", simulation["data"]["routeRuleId"]);
    assert_eq!("101", simulation["data"]["targets"][0]["providerAccountId"]);

    let test_send = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/diagnostics/test_sends",
            r#"{"sceneCode":"login","channel":"email","deliveryPurpose":"verification","templateCode":"login-email-code","targetMasked":"u***@example.com","targetHash":"target-hash-1","dryRun":true,"variables":{"code":"123456"}}"#,
        ),
    )
    .await;
    assert_eq!(0, test_send["code"].as_i64().unwrap());
    assert_eq!("message-request-1", test_send["data"]["requestId"]);
    assert_eq!("queued", test_send["data"]["deliveryStatus"]);
    assert_eq!("smtp", test_send["data"]["providerCode"]);

    let marketing_send = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/template_sends",
            r#"{"sceneCode":"spring-campaign","channel":"email","deliveryPurpose":"marketing","templateCode":"spring-campaign-email","countryCode":"US","locale":"en-US","userSegment":"vip","targetMasked":"u***@example.com","targetHash":"marketing-target-hash","dryRun":false,"variables":{"coupon":"SAVE20"}}"#,
        ),
    )
    .await;
    assert_eq!(0, marketing_send["code"].as_i64().unwrap());
    assert_eq!(
        "message-request-marketing",
        marketing_send["data"]["requestId"]
    );
    assert_eq!("queued", marketing_send["data"]["deliveryStatus"]);
    assert_eq!("sendgrid", marketing_send["data"]["providerCode"]);

    let suppression = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/suppressions",
            r#"{"channel":"email","targetMasked":"u***@example.com","targetHash":"target-hash-1","reasonCode":"unsubscribe","scopeType":"tenant","scopeId":"*","startsAt":"2026-05-25T00:00:00Z","endsAt":"2026-06-25T00:00:00Z","source":"operator","note":"user requested unsubscribe"}"#,
        ),
    )
    .await;
    assert_eq!(0, suppression["code"].as_i64().unwrap());
    assert_eq!("suppression-created", suppression["data"]["id"]);
    assert_eq!("active", suppression["data"]["status"]);

    let policy = request_json(
        router,
        trusted_json_request(
            "PUT",
            "/backend/v3/api/messaging/verification_policies/policy-login",
            r#"{"allowedChannels":["sms","email"],"defaultChannel":"sms","codeLength":6,"ttlSeconds":300,"resendIntervalSeconds":60,"maxSendPerHour":5,"maxVerifyAttempts":5,"templateCode":"login-code","riskPolicy":{"bindDevice":true}}"#,
        ),
    )
    .await;
    assert_eq!(0, policy["code"].as_i64().unwrap());
    assert_eq!("policy-login", policy["data"]["id"]);
    assert_eq!("active", policy["data"]["status"]);
}

#[tokio::test]
async fn admin_messaging_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_messaging_router_with_store(
        Arc::new(TestAdminMessagingStore),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/messaging/provider_accounts")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40101, payload["code"].as_i64().unwrap());
}

#[tokio::test]
async fn admin_messaging_write_routes_require_idempotency_key_when_the_operation_is_not_idempotent_by_path(
) {
    let router = sdkwork_clawrouter_router_service::api::admin_messaging_router_with_store(
        Arc::new(TestAdminMessagingStore),
    );

    let response = router
        .oneshot(trusted_json_request_without_idempotency(
            "POST",
            "/backend/v3/api/messaging/provider_accounts",
            r#"{"providerCode":"aliyun","accountCode":"primary-sms","accountName":"Primary SMS","channel":"sms","credential":{"secretRef":"secret://messaging/aliyun-primary"}}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .expect("error message should be text")
        .contains("Idempotency-Key"));
}

#[tokio::test]
async fn admin_messaging_route_rejects_invalid_channel_and_empty_route_targets_before_store_call() {
    let router = sdkwork_clawrouter_router_service::api::admin_messaging_router_with_store(
        Arc::new(TestAdminMessagingStore),
    );

    let invalid_channel = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/templates",
            r#"{"templateCode":"login-code","sceneCode":"login","channel":"push","deliveryPurpose":"verification","category":"otp","templateName":"Login Code","bodyTemplate":"Code {{code}}"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, invalid_channel.status());
    let payload = json_payload(invalid_channel).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("channel"));

    let invalid_provider_purpose = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/provider_accounts",
            r#"{"providerCode":"aliyun","accountCode":"primary-sms","accountName":"Primary SMS","channel":"sms","deliveryPurpose":"newsletter","credential":{"secretRef":"secret://messaging/aliyun-primary"}}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, invalid_provider_purpose.status());
    let payload = json_payload(invalid_provider_purpose).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("deliveryPurpose"));

    let invalid_email_sender = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/sender_identities",
            r#"{"providerAccountId":"101","channel":"email","identityCode":"email-without-from","displayName":"Email Sender","domainName":"example.com"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, invalid_email_sender.status());
    let payload = json_payload(invalid_email_sender).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("fromEmail"));

    let invalid_sms_sender = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/sender_identities",
            r#"{"providerAccountId":"101","channel":"sms","identityCode":"sms-without-sign","displayName":"SMS Sender"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, invalid_sms_sender.status());
    let payload = json_payload(invalid_sms_sender).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("signName"));

    let invalid_sms_format = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/templates",
            r#"{"templateCode":"login-code","sceneCode":"login","channel":"sms","deliveryPurpose":"verification","category":"otp","templateName":"Login Code","bodyTemplate":"<p>Code {{code}}</p>","contentFormat":"html"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, invalid_sms_format.status());
    let payload = json_payload(invalid_sms_format).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("contentFormat"));

    let invalid_variable_schema = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/templates",
            r#"{"templateCode":"bad-schema","sceneCode":"login","channel":"sms","deliveryPurpose":"verification","category":"otp","templateName":"Bad Schema","bodyTemplate":"Code {{code}}","contentFormat":"text","variableSchema":{"required":["code","code"]}}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, invalid_variable_schema.status());
    let payload = json_payload(invalid_variable_schema).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("variableSchema"));

    let empty_targets = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/route_rules",
            r#"{"ruleCode":"login-sms-primary","sceneCode":"login","channel":"sms","deliveryPurpose":"verification","targets":[]}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, empty_targets.status());
    let payload = json_payload(empty_targets).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("targets"));

    let duplicate_target_order = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/route_rules",
            r#"{"ruleCode":"login-sms-duplicate-order","sceneCode":"login","channel":"sms","deliveryPurpose":"verification","targets":[{"providerAccountId":"101","targetOrder":1,"weight":100},{"providerAccountId":"102","targetOrder":1,"weight":100}]}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, duplicate_target_order.status());
    let payload = json_payload(duplicate_target_order).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("targets.targetOrder"));

    let invalid_suppression_time_order = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/suppressions",
            r#"{"channel":"email","targetMasked":"u***@example.com","targetHash":"target-hash-1","reasonCode":"unsubscribe","startsAt":"2026-06-25T00:00:00Z","endsAt":"2026-05-25T00:00:00Z"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(
        StatusCode::BAD_REQUEST,
        invalid_suppression_time_order.status()
    );
    let payload = json_payload(invalid_suppression_time_order).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("endsAt"));

    let invalid_suppression_timestamp = router
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/messaging/suppressions",
            r#"{"channel":"email","targetMasked":"u***@example.com","targetHash":"target-hash-1","reasonCode":"unsubscribe","startsAt":"not-a-time"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(
        StatusCode::BAD_REQUEST,
        invalid_suppression_timestamp.status()
    );
    let payload = json_payload(invalid_suppression_timestamp).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("startsAt"));
}

fn trusted_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::empty())
        .unwrap()
}

fn trusted_empty_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30)
        .header("x-request-id", ADMIN_MESSAGING_ACTION_REQUEST_ID)
        .body(Body::empty())
        .unwrap()
}

fn trusted_json_request(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30)
        .header("idempotency-key", "admin-messaging-test")
        .header("x-request-id", ADMIN_MESSAGING_WRITE_REQUEST_ID)
        .body(Body::from(body.to_owned()))
        .unwrap()
}

fn trusted_json_request_without_idempotency(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::from(body.to_owned()))
        .unwrap()
}

async fn request_json(router: axum::Router, request: Request<Body>) -> Value {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(StatusCode::OK, response.status());
    json_payload(response).await
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

fn assert_server_request_id(value: &str, client_header_value: &str) {
    let bytes = value.as_bytes();
    assert_eq!(36, bytes.len(), "request id must be a canonical UUID");
    assert_ne!(
        client_header_value, value,
        "server-generated request id must ignore client X-Request-Id"
    );
    assert_eq!(b'-', bytes[8]);
    assert_eq!(b'-', bytes[13]);
    assert_eq!(b'-', bytes[18]);
    assert_eq!(b'-', bytes[23]);
    assert_eq!(b'4', bytes[14], "generated request id must be UUID v4");
    assert!(
        matches!(bytes[19], b'8' | b'9' | b'a' | b'b'),
        "generated request id must use RFC 4122 variant"
    );
    assert!(bytes.iter().enumerate().all(|(index, byte)| {
        matches!(index, 8 | 13 | 18 | 23) && *byte == b'-'
            || !matches!(index, 8 | 13 | 18 | 23) && byte.is_ascii_hexdigit()
    }));
}

struct TestAdminMessagingStore;

impl AdminMessagingStore for TestAdminMessagingStore {
    fn list_provider_accounts<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move {
            assert_eq!(10, query.subject.tenant_id);
            assert_eq!(20, query.subject.organization_id);
            assert_eq!(30, query.subject.operator_id);
            assert_eq!(2, query.page_no);
            assert_eq!(25, query.page_size);
            assert_eq!(Some("active"), query.status.as_deref());
            assert_eq!(Some("sms"), query.channel.as_deref());
            assert_eq!(Some("aliyun"), query.provider_code.as_deref());
            assert_eq!(Some("main"), query.q.as_deref());
            Ok(collection("provider-account-1", query))
        })
    }

    fn create_provider_account<'a>(
        &'a self,
        command: CreateMessagingProviderAccountCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move {
            assert_eq!("aliyun", command.provider_code);
            assert_eq!("primary-sms", command.account_code);
            assert_eq!("Primary SMS", command.account_name);
            assert_eq!("sms", command.channel);
            assert_eq!(Some("verification"), command.delivery_purpose.as_deref());
            assert_eq!("secret://messaging/aliyun-primary", command.secret_ref);
            assert_eq!(Some("access_key"), command.auth_type.as_deref());
            assert_eq!("admin-messaging-test", command.idempotency_key);
            Ok(AdminMessagingMutationItem {
                id: "provider-account-created".to_owned(),
                status: "active".to_owned(),
            })
        })
    }

    fn list_sender_identities<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { Ok(collection("sender-identity-1", query)) })
    }

    fn create_sender_identity<'a>(
        &'a self,
        command: CreateMessagingSenderIdentityCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move {
            assert_eq!("101", command.provider_account_id);
            assert_eq!("email", command.channel);
            assert_eq!("no-reply", command.identity_code);
            assert_eq!(Some("noreply@example.com"), command.from_email.as_deref());
            Ok(AdminMessagingMutationItem {
                id: "sender-created".to_owned(),
                status: "draft".to_owned(),
            })
        })
    }

    fn list_templates<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { Ok(collection("template-1", query)) })
    }

    fn create_template<'a>(
        &'a self,
        command: CreateMessagingTemplateCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move {
            assert_eq!("login-code", command.template_code);
            assert_eq!("login", command.scene_code);
            assert_eq!("sms", command.channel);
            assert_eq!("verification", command.delivery_purpose);
            assert_eq!("otp", command.category);
            assert_eq!("Login Code", command.template_name);
            assert_eq!("Code {{code}}", command.body_template);
            assert_eq!(Some("text"), command.content_format.as_deref());
            assert_eq!(Some("zh-CN"), command.locale.as_deref());
            Ok(AdminMessagingMutationItem {
                id: "template-created".to_owned(),
                status: "draft".to_owned(),
            })
        })
    }

    fn publish_template_version<'a>(
        &'a self,
        command: PublishMessagingTemplateVersionCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move {
            assert_eq!("201", command.template_id);
            assert_eq!("301", command.version_id);
            assert_server_request_id(&command.request_id, ADMIN_MESSAGING_ACTION_REQUEST_ID);
            Ok(AdminMessagingMutationItem {
                id: command.version_id,
                status: "published".to_owned(),
            })
        })
    }

    fn list_route_rules<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { Ok(collection("route-rule-1", query)) })
    }

    fn create_route_rule<'a>(
        &'a self,
        command: CreateMessagingRouteRuleCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move {
            assert_eq!("login-sms-primary", command.rule_code);
            assert_eq!("login", command.scene_code);
            assert_eq!("sms", command.channel);
            assert_eq!("verification", command.delivery_purpose);
            assert_eq!(Some("CN"), command.country_code.as_deref());
            assert_eq!(Some("zh-CN"), command.locale.as_deref());
            assert_eq!(Some("default"), command.user_segment.as_deref());
            assert_eq!(10, command.priority.unwrap());
            assert_eq!(1, command.targets.len());
            assert_eq!("101", command.targets[0].provider_account_id);
            assert_eq!(
                Some("501"),
                command.targets[0].sender_identity_id.as_deref()
            );
            assert_eq!(
                Some("701"),
                command.targets[0].template_binding_id.as_deref()
            );
            assert_eq!(1, command.targets[0].target_order);
            assert_eq!(Some(100), command.targets[0].weight);
            Ok(AdminMessagingMutationItem {
                id: "route-rule-created".to_owned(),
                status: "active".to_owned(),
            })
        })
    }

    fn list_send_requests<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move {
            assert_eq!(Some("login"), query.scene_code.as_deref());
            assert_eq!(Some("target-1"), query.target_hash.as_deref());
            Ok(collection("send-request-1", query))
        })
    }

    fn simulate_route<'a>(
        &'a self,
        command: AdminMessagingRouteSimulationCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingRouteSimulationItem> {
        Box::pin(async move {
            assert_eq!("login", command.scene_code);
            assert_eq!("sms", command.channel);
            assert_eq!("verification", command.delivery_purpose);
            assert_eq!(Some("CN"), command.country_code.as_deref());
            assert_eq!(Some("zh-CN"), command.locale.as_deref());
            assert_eq!(Some("default"), command.user_segment.as_deref());
            Ok(AdminMessagingRouteSimulationItem {
                matched: true,
                route_rule_id: Some("route-rule-1".to_owned()),
                targets: vec![record_with("target-1", &[("providerAccountId", "101")])],
            })
        })
    }

    fn test_send<'a>(
        &'a self,
        command: AdminMessagingTestSendCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingTestSendItem> {
        Box::pin(async move {
            assert_eq!("login", command.scene_code);
            assert_eq!("email", command.channel);
            assert_eq!("verification", command.delivery_purpose);
            assert_eq!("login-email-code", command.template_code);
            assert_eq!("u***@example.com", command.target_masked);
            assert_eq!("target-hash-1", command.target_hash);
            assert_eq!(true, command.dry_run.unwrap());
            assert_eq!("admin-messaging-test", command.idempotency_key);
            Ok(AdminMessagingTestSendItem {
                request_id: "message-request-1".to_owned(),
                delivery_status: "queued".to_owned(),
                provider_code: Some("smtp".to_owned()),
            })
        })
    }

    fn send_template<'a>(
        &'a self,
        command: AdminMessagingTemplateSendCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingTestSendItem> {
        Box::pin(async move {
            assert_eq!("spring-campaign", command.scene_code);
            assert_eq!("email", command.channel);
            assert_eq!("marketing", command.delivery_purpose);
            assert_eq!("spring-campaign-email", command.template_code);
            assert_eq!(Some("US"), command.country_code.as_deref());
            assert_eq!(Some("en-US"), command.locale.as_deref());
            assert_eq!(Some("vip"), command.user_segment.as_deref());
            assert_eq!("u***@example.com", command.target_masked);
            assert_eq!("marketing-target-hash", command.target_hash);
            assert_eq!(false, command.dry_run.unwrap());
            assert_eq!("admin-messaging-test", command.idempotency_key);
            Ok(AdminMessagingTestSendItem {
                request_id: "message-request-marketing".to_owned(),
                delivery_status: "queued".to_owned(),
                provider_code: Some("sendgrid".to_owned()),
            })
        })
    }

    fn list_suppressions<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move {
            assert_eq!(Some("bounced"), query.reason_code.as_deref());
            Ok(collection("suppression-1", query))
        })
    }

    fn create_suppression<'a>(
        &'a self,
        command: CreateMessagingSuppressionCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move {
            assert_eq!("email", command.channel);
            assert_eq!("u***@example.com", command.target_masked);
            assert_eq!("target-hash-1", command.target_hash);
            assert_eq!("unsubscribe", command.reason_code);
            assert_eq!("tenant", command.scope_type);
            assert_eq!("*", command.scope_id);
            assert_eq!("2026-05-25T00:00:00Z", command.starts_at);
            assert_eq!(Some("2026-06-25T00:00:00Z"), command.ends_at.as_deref());
            assert_eq!("operator", command.source);
            assert_eq!(Some("user requested unsubscribe"), command.note.as_deref());
            assert_eq!("admin-messaging-test", command.idempotency_key);
            Ok(AdminMessagingMutationItem {
                id: "suppression-created".to_owned(),
                status: "active".to_owned(),
            })
        })
    }

    fn list_rate_limit_buckets<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move {
            assert_eq!(Some("ip-1"), query.ip_hash.as_deref());
            assert_eq!(Some("device-1"), query.device_hash.as_deref());
            Ok(collection("rate-limit-1", query))
        })
    }

    fn list_verification_policies<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { Ok(collection("verification-policy-1", query)) })
    }

    fn update_verification_policy<'a>(
        &'a self,
        command: UpdateVerificationPolicyCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move {
            assert_eq!("policy-login", command.policy_id);
            assert_eq!(
                vec!["sms".to_owned(), "email".to_owned()],
                command.allowed_channels
            );
            assert_eq!(Some("sms"), command.default_channel.as_deref());
            assert_eq!(6, command.code_length);
            assert_eq!(300, command.ttl_seconds);
            assert_eq!(5, command.max_verify_attempts);
            assert_eq!("login-code", command.template_code);
            Ok(AdminMessagingMutationItem {
                id: command.policy_id,
                status: "active".to_owned(),
            })
        })
    }
}

fn collection(id: &str, query: ListAdminMessagingRecordsQuery) -> AdminMessagingCollection {
    AdminMessagingCollection {
        items: vec![record(id)],
        total: 1,
        page_no: query.page_no,
        page_size: query.page_size,
    }
}

fn record(id: &str) -> AdminMessagingJsonRecord {
    record_with(id, &[])
}

fn record_with(id: &str, values: &[(&str, &str)]) -> AdminMessagingJsonRecord {
    let mut record = Map::new();
    record.insert("id".to_owned(), json!(id));
    record.insert("status".to_owned(), json!("active"));
    for (key, value) in values {
        record.insert((*key).to_owned(), json!(value));
    }
    record
}
