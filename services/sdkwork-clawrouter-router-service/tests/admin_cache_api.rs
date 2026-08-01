pub mod common;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use common::InternalTrustedSubjectHeaders;
use sdkwork_clawrouter_router_service::application::{
    CacheInstanceSpec, CacheNamespacePolicy, CacheRuntime, CacheRuntimeTarget, RuntimeCacheManager,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_cache_route_returns_overview_and_supports_refresh_and_delete() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop local cache",
            "claw",
            300,
            Some(100_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "local-default",
            300,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    });
    manager
        .set_json(
            "auth.qr.challenge",
            "qr-admin-cache-1",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            "auth.qr.challenge",
            "qr-admin-cache-2",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();

    let router =
        sdkwork_clawrouter_router_service::api::admin_cache_router_with_manager(manager.clone());

    let overview_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/cache/overview",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, overview_response.status());
    let overview_payload = json_payload(overview_response).await;
    assert_eq!(0, overview_payload["code"].as_i64().unwrap());
    assert_eq!(1, overview_payload["data"]["summary"]["totalInstances"]);
    assert_eq!(1, overview_payload["data"]["summary"]["totalNamespaces"]);
    assert_eq!(2, overview_payload["data"]["summary"]["totalEntries"]);
    assert_eq!(
        "local_cache",
        overview_payload["data"]["instances"][0]["providerKind"]
    );
    assert_eq!(
        "auth.qr.challenge",
        overview_payload["data"]["namespacePolicies"][0]["namespace"]
    );
    assert_eq!(
        "fail_closed",
        overview_payload["data"]["namespacePolicies"][0]["failureMode"]
    );
    assert_eq!(
        "coordination_critical",
        overview_payload["data"]["namespacePolicies"][0]["consistency"]
    );
    assert_eq!(
        0,
        overview_payload["data"]["namespacePolicies"][0]["jitterPercent"]
    );
    assert_eq!(
        0,
        overview_payload["data"]["namespacePolicies"][0]["staleWhileRevalidateSeconds"]
    );

    let keys_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/keys?page_size=1",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, keys_response.status());
    let keys_payload = json_payload(keys_response).await;
    assert_eq!(0, keys_payload["code"].as_i64().unwrap());
    assert_eq!("auth.qr.challenge", keys_payload["data"]["namespace"]);
    assert_eq!("local-default", keys_payload["data"]["instanceName"]);
    assert_eq!(2, keys_payload["data"]["scannedItems"]);
    assert_eq!(1, keys_payload["data"]["returnedItems"]);
    assert!(keys_payload["data"].get("limit").is_none());
    assert_eq!("cursor", keys_payload["data"]["pageInfo"]["mode"]);
    assert_eq!(1, keys_payload["data"]["pageInfo"]["pageSize"]);
    assert_eq!(true, keys_payload["data"]["pageInfo"]["hasMore"]);
    assert!(keys_payload["data"]["pageInfo"]["nextCursor"].is_string());
    assert_eq!(false, keys_payload["data"]["scanComplete"]);
    assert_eq!("qr-admin-cache-1", keys_payload["data"]["items"][0]["key"]);
    assert_eq!("active", keys_payload["data"]["items"][0]["status"]);
    assert!(keys_payload["data"]["items"][0].get("value").is_none());
    assert!(keys_payload["data"]["items"][0].get("payload").is_none());

    let refresh_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/cache/refresh",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, refresh_response.status());
    let refresh_payload = json_payload(refresh_response).await;
    assert_eq!("refresh_all", refresh_payload["data"]["operation"]);
    assert_eq!("completed", refresh_payload["data"]["status"]);

    let namespace_refresh_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/refresh",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, namespace_refresh_response.status());
    let namespace_refresh_payload = json_payload(namespace_refresh_response).await;
    assert_eq!(
        "refresh_namespace",
        namespace_refresh_payload["data"]["operation"]
    );
    assert_eq!(
        "auth.qr.challenge",
        namespace_refresh_payload["data"]["namespace"]
    );
    assert_eq!(
        "local-default",
        namespace_refresh_payload["data"]["instanceName"]
    );
    assert_eq!("completed", namespace_refresh_payload["data"]["status"]);

    let delete_instance_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/system/cache/instances/local-default",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NO_CONTENT, delete_instance_response.status());
    assert!(
        axum::body::to_bytes(delete_instance_response.into_body(), usize::MAX)
            .await
            .unwrap()
            .is_empty()
    );
    assert!(manager
        .get_json("auth.qr.challenge", "qr-admin-cache-1")
        .await
        .unwrap()
        .is_none());
    manager
        .set_json(
            "auth.qr.challenge",
            "qr-admin-cache-1",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            "auth.qr.challenge",
            "qr-admin-cache-2",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();

    let delete_key_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/keys/qr-admin-cache-1",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NO_CONTENT, delete_key_response.status());
    assert!(
        axum::body::to_bytes(delete_key_response.into_body(), usize::MAX)
            .await
            .unwrap()
            .is_empty()
    );
    assert!(manager
        .get_json("auth.qr.challenge", "qr-admin-cache-1")
        .await
        .unwrap()
        .is_none());

    let delete_namespace_response = router
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NO_CONTENT, delete_namespace_response.status());
    assert!(
        axum::body::to_bytes(delete_namespace_response.into_body(), usize::MAX)
            .await
            .unwrap()
            .is_empty()
    );
    assert!(manager
        .get_json("auth.qr.challenge", "qr-admin-cache-2")
        .await
        .unwrap()
        .is_none());
}

#[tokio::test]
async fn admin_cache_key_route_accepts_cursor_for_next_page() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop local cache",
            "claw",
            300,
            Some(100_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "local-default",
            300,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    });
    for index in 1..=3 {
        manager
            .set_json(
                "auth.qr.challenge",
                &format!("qr-admin-cursor-{index}"),
                serde_json::json!({ "status": "pending" }),
            )
            .await
            .unwrap();
    }

    let router = sdkwork_clawrouter_router_service::api::admin_cache_router_with_manager(manager);
    let first_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/keys?page_size=2",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, first_response.status());
    let first_payload = json_payload(first_response).await;
    let cursor = first_payload["data"]["pageInfo"]["nextCursor"]
        .as_str()
        .expect("first page must include cursor");

    let second_response = router
        .oneshot(signed_request(
            "GET",
            &format!(
                "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/keys?page_size=2&cursor={cursor}"
            ),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, second_response.status());
    let second_payload = json_payload(second_response).await;
    assert_eq!(1, second_payload["data"]["scannedItems"]);
    assert_eq!(1, second_payload["data"]["returnedItems"]);
    assert_eq!("cursor", second_payload["data"]["pageInfo"]["mode"]);
    assert_eq!(2, second_payload["data"]["pageInfo"]["pageSize"]);
    assert_eq!(false, second_payload["data"]["pageInfo"]["hasMore"]);
    assert_eq!(true, second_payload["data"]["scanComplete"]);
    assert!(second_payload["data"]["pageInfo"]["nextCursor"].is_null());
    assert_eq!(
        "qr-admin-cursor-3",
        second_payload["data"]["items"][0]["key"]
    );
}

#[tokio::test]
async fn admin_cache_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_cache_router_with_manager(
        sdkwork_clawrouter_router_service::application::default_desktop_cache_manager(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/system/cache/overview")
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
async fn admin_cache_route_reports_unknown_management_targets_as_not_found() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop local cache",
            "claw",
            300,
            Some(100_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "local-default",
            300,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    });
    let router = sdkwork_clawrouter_router_service::api::admin_cache_router_with_manager(manager);

    let missing_instance_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/cache/instances/missing-cache/refresh",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, missing_instance_response.status());
    let missing_instance_payload = json_payload(missing_instance_response).await;
    assert_eq!(40401, missing_instance_payload["code"].as_i64().unwrap());

    let missing_instance_delete_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/system/cache/instances/missing-cache",
        ))
        .await
        .unwrap();
    assert_eq!(
        StatusCode::NOT_FOUND,
        missing_instance_delete_response.status()
    );
    let missing_instance_delete_payload = json_payload(missing_instance_delete_response).await;
    assert_eq!(
        40401,
        missing_instance_delete_payload["code"].as_i64().unwrap()
    );

    let missing_namespace_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/system/cache/namespaces/missing.namespace",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, missing_namespace_response.status());
    let missing_namespace_payload = json_payload(missing_namespace_response).await;
    assert_eq!(40401, missing_namespace_payload["code"].as_i64().unwrap());

    let missing_namespace_refresh_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/cache/namespaces/missing.namespace/refresh",
        ))
        .await
        .unwrap();
    assert_eq!(
        StatusCode::NOT_FOUND,
        missing_namespace_refresh_response.status()
    );
    let missing_namespace_refresh_payload = json_payload(missing_namespace_refresh_response).await;
    assert_eq!(
        40401,
        missing_namespace_refresh_payload["code"].as_i64().unwrap()
    );

    let missing_namespace_keys_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/cache/namespaces/missing.namespace/keys",
        ))
        .await
        .unwrap();
    assert_eq!(
        StatusCode::NOT_FOUND,
        missing_namespace_keys_response.status()
    );
    let missing_namespace_keys_payload = json_payload(missing_namespace_keys_response).await;
    assert_eq!(
        40401,
        missing_namespace_keys_payload["code"].as_i64().unwrap()
    );

    let legacy_limit_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/keys?limit=1",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, legacy_limit_response.status());
    let legacy_limit_payload = json_payload(legacy_limit_response).await;
    assert_eq!(40003, legacy_limit_payload["code"].as_i64().unwrap());

    let invalid_page_size_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/keys?page_size=0",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, invalid_page_size_response.status());
    let invalid_page_size_payload = json_payload(invalid_page_size_response).await;
    assert_eq!(40003, invalid_page_size_payload["code"].as_i64().unwrap());

    let oversized_page_size_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/keys?page_size=201",
        ))
        .await
        .unwrap();
    assert_eq!(
        StatusCode::BAD_REQUEST,
        oversized_page_size_response.status()
    );
    let oversized_page_size_payload = json_payload(oversized_page_size_response).await;
    assert_eq!(40003, oversized_page_size_payload["code"].as_i64().unwrap());

    let oversized_cursor = "a".repeat(2_049);
    let invalid_cursor_response = router
        .oneshot(signed_request(
            "GET",
            &format!(
                "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/keys?cursor={oversized_cursor}"
            ),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, invalid_cursor_response.status());
    let invalid_cursor_payload = json_payload(invalid_cursor_response).await;
    assert_eq!(40003, invalid_cursor_payload["code"].as_i64().unwrap());
    assert!(invalid_cursor_payload["detail"]
        .as_str()
        .unwrap()
        .contains("cache key list cursor must not exceed 2048 characters"));
}

#[tokio::test]
async fn admin_cache_route_reports_disabled_management_operations_as_conflict() {
    let mut instance = CacheInstanceSpec::local(
        "local-default",
        "Desktop local cache",
        "claw",
        300,
        Some(100_000),
    );
    instance.supports_refresh = false;
    instance.supports_delete = false;
    instance.supports_inspect = false;
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![instance],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "local-default",
            300,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    });
    let router = sdkwork_clawrouter_router_service::api::admin_cache_router_with_manager(manager);

    let refresh_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/cache/instances/local-default/refresh",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, refresh_response.status());
    let refresh_payload = json_payload(refresh_response).await;
    assert_eq!(40901, refresh_payload["code"].as_i64().unwrap());

    let delete_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, delete_response.status());
    let delete_payload = json_payload(delete_response).await;
    assert_eq!(40901, delete_payload["code"].as_i64().unwrap());

    let delete_instance_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/system/cache/instances/local-default",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, delete_instance_response.status());
    let delete_instance_payload = json_payload(delete_instance_response).await;
    assert_eq!(40901, delete_instance_payload["code"].as_i64().unwrap());

    let namespace_refresh_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/refresh",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, namespace_refresh_response.status());
    let namespace_refresh_payload = json_payload(namespace_refresh_response).await;
    assert_eq!(40901, namespace_refresh_payload["code"].as_i64().unwrap());

    let inspect_response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/cache/namespaces/auth.qr.challenge/keys",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, inspect_response.status());
    let inspect_payload = json_payload(inspect_response).await;
    assert_eq!(40901, inspect_payload["code"].as_i64().unwrap());
}

fn signed_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::empty())
        .unwrap()
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}
