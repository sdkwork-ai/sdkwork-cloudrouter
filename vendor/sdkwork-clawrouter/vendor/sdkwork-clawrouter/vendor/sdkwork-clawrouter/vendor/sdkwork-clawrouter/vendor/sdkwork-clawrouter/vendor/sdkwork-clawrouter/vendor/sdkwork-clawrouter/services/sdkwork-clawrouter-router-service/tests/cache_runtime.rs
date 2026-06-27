use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use sdkwork_clawrouter_router_service::application::{
    CacheBackend, CacheBackendCursor, CacheBackendFuture, CacheBackendKeyList, CacheBackendStats,
    CacheInstanceSpec, CacheNamespacePolicy, CacheOperationOutcome, CacheProviderKind,
    CacheRuntime, CacheRuntimeTarget, LocalCacheBackend, RuntimeCacheManager,
    DEFAULT_REDIS_CONNECTION_PROFILE_NAME, ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
    ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE, ROUTING_IDEMPOTENCY_CACHE_NAMESPACE,
    ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE, ROUTING_SNAPSHOT_CACHE_NAMESPACE,
};
use sdkwork_clawrouter_router_service::domain::{DomainError, DomainResult};

#[derive(Clone)]
struct ManualClock {
    origin: Instant,
    elapsed_millis: Arc<AtomicU64>,
}

impl ManualClock {
    fn new() -> Self {
        Self {
            origin: Instant::now(),
            elapsed_millis: Arc::new(AtomicU64::new(0)),
        }
    }

    fn now(&self) -> Instant {
        self.origin + Duration::from_millis(self.elapsed_millis.load(Ordering::Relaxed))
    }

    fn advance(&self, duration: Duration) {
        let delta = duration.as_millis().min(u128::from(u64::MAX)) as u64;
        self.elapsed_millis.fetch_add(delta, Ordering::Relaxed);
    }
}

#[tokio::test]
async fn local_cache_runtime_tracks_entries_and_deletes_by_namespace() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "desktop-default",
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    })
    .with_backend("desktop-default", Arc::new(LocalCacheBackend::new()));

    manager
        .set_json(
            "auth.qr.challenge",
            "qr-1",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            "auth.qr.challenge",
            "qr-2",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();

    let snapshot = manager.snapshot().await.unwrap();
    assert_eq!(
        CacheProviderKind::LocalCache,
        snapshot.instances[0].provider_kind
    );
    assert_eq!(2, snapshot.instances[0].entry_count);
    assert_eq!(2, snapshot.summary.total_entries);

    let deleted = manager.delete_namespace("auth.qr.challenge").await.unwrap();
    assert_eq!(2, deleted.deleted_entries);
    assert!(manager
        .get_json("auth.qr.challenge", "qr-1")
        .await
        .unwrap()
        .is_none());
}

#[tokio::test]
async fn default_cache_runtime_declares_ai_routing_namespaces_for_multilevel_cache() {
    let desktop = sdkwork_clawrouter_router_service::application::default_desktop_cache_runtime();
    let service = sdkwork_clawrouter_router_service::application::default_service_cache_runtime(
        DEFAULT_REDIS_CONNECTION_PROFILE_NAME,
        "claw",
    );

    for runtime in [desktop, service] {
        let namespaces = runtime
            .namespace_policies
            .iter()
            .map(|policy| policy.namespace.as_str())
            .collect::<Vec<_>>();
        for namespace in [
            ROUTING_SNAPSHOT_CACHE_NAMESPACE,
            ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
            ROUTING_IDEMPOTENCY_CACHE_NAMESPACE,
            ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
            ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE,
        ] {
            assert!(
                namespaces.contains(&namespace),
                "default cache runtime must include routing cache namespace {namespace}"
            );
        }

        let sticky_policy = runtime
            .namespace_policies
            .iter()
            .find(|policy| policy.namespace == ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE)
            .unwrap();
        assert_eq!("coordination_critical", sticky_policy.consistency);
        assert_eq!("origin_fallback", sticky_policy.failure_mode);
        assert!(
            sticky_policy.ttl_seconds <= 3600,
            "sticky L1 cache must be bounded so DB remains authoritative"
        );
    }
}

#[tokio::test]
async fn cache_runtime_refreshes_one_namespace_without_touching_other_namespaces() {
    let clock = ManualClock::new();
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![
            CacheNamespacePolicy::new(
                "auth.qr.challenge",
                "desktop-default",
                1,
                "session",
                "sensitive",
                vec!["auth".to_owned(), "qr".to_owned()],
            ),
            CacheNamespacePolicy::new(
                "runtime.snapshot",
                "desktop-default",
                120,
                "global",
                "internal",
                vec!["runtime".to_owned()],
            ),
        ],
    })
    .with_backend(
        "desktop-default",
        Arc::new(LocalCacheBackend::with_max_entries_and_clock(None, {
            let clock = clock.clone();
            move || clock.now()
        })),
    );

    manager
        .set_json(
            "auth.qr.challenge",
            "expired-qr",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            "runtime.snapshot",
            "active-runtime",
            serde_json::json!({ "status": "active" }),
        )
        .await
        .unwrap();
    clock.advance(Duration::from_millis(1_100));

    let outcome = manager
        .refresh_namespace("auth.qr.challenge")
        .await
        .unwrap();

    assert_eq!("refresh_namespace", outcome.operation);
    assert_eq!(Some("desktop-default"), outcome.instance_name.as_deref());
    assert_eq!(Some("auth.qr.challenge"), outcome.namespace.as_deref());
    assert_eq!(1, outcome.deleted_entries);
    assert_eq!(0, outcome.refreshed_entries);
    assert!(manager
        .get_json("auth.qr.challenge", "expired-qr")
        .await
        .unwrap()
        .is_none());
    assert!(manager
        .get_json("runtime.snapshot", "active-runtime")
        .await
        .unwrap()
        .is_some());

    let snapshot = manager.snapshot().await.unwrap();
    assert_eq!(1, snapshot.summary.cache_refreshes);
    assert_eq!(1, snapshot.instances[0].cache_refreshes);
}

#[tokio::test]
async fn cache_runtime_deletes_one_instance_without_touching_other_instances() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![
            CacheInstanceSpec::local(
                "primary-cache",
                "Primary local cache",
                "primary",
                120,
                Some(10_000),
            ),
            CacheInstanceSpec::local(
                "secondary-cache",
                "Secondary local cache",
                "secondary",
                120,
                Some(10_000),
            ),
        ],
        namespace_policies: vec![
            CacheNamespacePolicy::new(
                "primary.namespace",
                "primary-cache",
                120,
                "global",
                "internal",
                vec!["primary".to_owned()],
            ),
            CacheNamespacePolicy::new(
                "secondary.namespace",
                "secondary-cache",
                120,
                "global",
                "internal",
                vec!["secondary".to_owned()],
            ),
        ],
    })
    .with_backend("primary-cache", Arc::new(LocalCacheBackend::new()))
    .with_backend("secondary-cache", Arc::new(LocalCacheBackend::new()));

    manager
        .set_json(
            "primary.namespace",
            "primary-key",
            serde_json::json!({ "status": "primary" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            "secondary.namespace",
            "secondary-key",
            serde_json::json!({ "status": "secondary" }),
        )
        .await
        .unwrap();

    let outcome = manager.delete_instance("primary-cache").await.unwrap();

    assert_eq!("delete_instance", outcome.operation);
    assert_eq!(Some("primary-cache"), outcome.instance_name.as_deref());
    assert_eq!(None, outcome.namespace.as_deref());
    assert_eq!(1, outcome.deleted_entries);
    assert_eq!(0, outcome.refreshed_entries);
    assert_eq!("completed", outcome.status);
    assert!(manager
        .get_json("primary.namespace", "primary-key")
        .await
        .unwrap()
        .is_none());
    assert!(manager
        .get_json("secondary.namespace", "secondary-key")
        .await
        .unwrap()
        .is_some());

    let snapshot = manager.snapshot().await.unwrap();
    let primary = snapshot
        .instances
        .iter()
        .find(|instance| instance.name == "primary-cache")
        .unwrap();
    let secondary = snapshot
        .instances
        .iter()
        .find(|instance| instance.name == "secondary-cache")
        .unwrap();
    assert_eq!(0, primary.entry_count);
    assert_eq!(1, primary.cache_deletes);
    assert_eq!(1, secondary.entry_count);
    assert_eq!(1, snapshot.summary.total_entries);
    assert_eq!(1, snapshot.summary.cache_deletes);
}

#[tokio::test]
async fn cache_runtime_snapshot_reports_operation_metrics() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "desktop-default",
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    })
    .with_backend("desktop-default", Arc::new(LocalCacheBackend::new()));

    manager
        .set_json(
            "auth.qr.challenge",
            "metrics-1",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();
    assert!(manager
        .get_json("auth.qr.challenge", "metrics-1")
        .await
        .unwrap()
        .is_some());
    assert!(manager
        .get_json("auth.qr.challenge", "missing")
        .await
        .unwrap()
        .is_none());
    manager
        .list_namespace_keys("auth.qr.challenge", Some(10), None)
        .await
        .unwrap();
    manager
        .delete_key("auth.qr.challenge", "metrics-1")
        .await
        .unwrap();
    let _ = manager
        .list_namespace_keys("missing.namespace", Some(1), None)
        .await
        .unwrap_err();

    let snapshot = manager.snapshot().await.unwrap();
    assert_eq!(1, snapshot.summary.cache_hits);
    assert_eq!(1, snapshot.summary.cache_misses);
    assert_eq!(1, snapshot.summary.cache_writes);
    assert_eq!(1, snapshot.summary.cache_deletes);
    assert_eq!(1, snapshot.summary.cache_inspections);
    assert_eq!(1, snapshot.summary.cache_errors);

    let instance = &snapshot.instances[0];
    assert_eq!(1, instance.cache_hits);
    assert_eq!(1, instance.cache_misses);
    assert_eq!(1, instance.cache_writes);
    assert_eq!(1, instance.cache_deletes);
    assert_eq!(1, instance.cache_inspections);
    assert_eq!(0, instance.cache_errors);
}

#[tokio::test]
async fn cache_runtime_snapshot_records_pre_backend_and_unresolved_errors() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "desktop-default",
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    })
    .with_backend("desktop-default", Arc::new(LocalCacheBackend::new()));

    manager
        .delete_key("auth.qr.challenge", "   ")
        .await
        .unwrap_err();
    manager
        .refresh_instance("missing-instance")
        .await
        .unwrap_err();

    let snapshot = manager.snapshot().await.unwrap();
    assert_eq!(2, snapshot.summary.cache_errors);
    assert_eq!(1, snapshot.instances[0].cache_errors);
}

#[tokio::test]
async fn cache_runtime_snapshot_degrades_one_instance_when_stats_fail() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![
            CacheInstanceSpec::local(
                "healthy-cache",
                "Healthy local cache",
                "healthy",
                120,
                Some(10_000),
            ),
            CacheInstanceSpec::local(
                "broken-cache",
                "Broken local cache",
                "broken",
                120,
                Some(10_000),
            ),
        ],
        namespace_policies: vec![
            CacheNamespacePolicy::new(
                "healthy.namespace",
                "healthy-cache",
                120,
                "global",
                "internal",
                vec!["healthy".to_owned()],
            ),
            CacheNamespacePolicy::new(
                "broken.namespace",
                "broken-cache",
                120,
                "global",
                "internal",
                vec!["broken".to_owned()],
            ),
        ],
    })
    .with_backend("healthy-cache", Arc::new(LocalCacheBackend::new()))
    .with_backend("broken-cache", Arc::new(FailingCacheBackend));

    manager
        .set_json(
            "healthy.namespace",
            "healthy-key",
            serde_json::json!({ "status": "ok" }),
        )
        .await
        .unwrap();

    let snapshot = manager.snapshot().await.unwrap();

    assert_eq!(2, snapshot.summary.total_instances);
    assert_eq!(1, snapshot.summary.total_entries);
    assert_eq!(1, snapshot.summary.cache_errors);
    assert_eq!("ready", snapshot.instances[0].status);
    assert_eq!("degraded", snapshot.instances[1].status);
    assert_eq!(0, snapshot.instances[1].entry_count);
    assert_eq!(1, snapshot.instances[1].cache_errors);
}

#[tokio::test]
async fn cache_namespace_key_listing_returns_safe_metadata_only() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "desktop-default",
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    })
    .with_backend("desktop-default", Arc::new(LocalCacheBackend::new()));

    manager
        .set_json(
            "auth.qr.challenge",
            "qr-list-1",
            serde_json::json!({ "secret": "must-not-leak" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            "auth.qr.challenge",
            "qr-list-2",
            serde_json::json!({ "secret": "must-not-leak" }),
        )
        .await
        .unwrap();

    let keys = manager
        .list_namespace_keys("auth.qr.challenge", None, None)
        .await
        .unwrap();

    assert_eq!("auth.qr.challenge", keys.namespace);
    assert_eq!("desktop-default", keys.instance_name);
    assert_eq!(2, keys.scanned_items);
    assert!(keys.scan_complete);
    assert_eq!(2, keys.returned_items);
    assert_eq!(None, keys.limit);
    assert!(!keys.has_more);
    assert_eq!(2, keys.items.len());
    assert_eq!("qr-list-1", keys.items[0].key);
    assert_eq!("qr-list-2", keys.items[1].key);
    assert!(keys
        .items
        .iter()
        .all(|item| item.namespace == "auth.qr.challenge"));
    assert!(keys
        .items
        .iter()
        .all(|item| item.instance_name == "desktop-default"));
    assert!(keys.items.iter().all(|item| item.status == "active"));
    assert!(keys
        .items
        .iter()
        .all(|item| item.expires_in_seconds.is_some()));
}

struct FailingCacheBackend;

impl CacheBackend for FailingCacheBackend {
    fn get_json<'a>(&'a self, _key: &'a str) -> CacheBackendFuture<'a, Option<serde_json::Value>> {
        Box::pin(async move { failing_backend_error() })
    }

    fn set_json<'a>(
        &'a self,
        _key: String,
        _value: serde_json::Value,
        _ttl: Duration,
    ) -> CacheBackendFuture<'a, ()> {
        Box::pin(async move { failing_backend_error() })
    }

    fn delete<'a>(&'a self, _key: &'a str) -> CacheBackendFuture<'a, bool> {
        Box::pin(async move { failing_backend_error() })
    }

    fn delete_prefix<'a>(&'a self, _prefix: String) -> CacheBackendFuture<'a, usize> {
        Box::pin(async move { failing_backend_error() })
    }

    fn refresh_prefix<'a>(
        &'a self,
        _prefix: String,
    ) -> CacheBackendFuture<'a, CacheOperationOutcome> {
        Box::pin(async move { failing_backend_error() })
    }

    fn stats_prefix<'a>(&'a self, _prefix: String) -> CacheBackendFuture<'a, CacheBackendStats> {
        Box::pin(async move { failing_backend_error() })
    }

    fn list_prefix<'a>(
        &'a self,
        _prefix: String,
        _limit: Option<usize>,
        _cursor: Option<CacheBackendCursor>,
    ) -> CacheBackendFuture<'a, CacheBackendKeyList> {
        Box::pin(async move { failing_backend_error() })
    }
}

fn failing_backend_error<T>() -> DomainResult<T> {
    Err(DomainError::new("failing cache backend"))
}

#[tokio::test]
async fn cache_namespace_key_listing_respects_limit_and_reports_has_more() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "desktop-default",
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    })
    .with_backend("desktop-default", Arc::new(LocalCacheBackend::new()));

    for index in 1..=3 {
        manager
            .set_json(
                "auth.qr.challenge",
                &format!("qr-page-{index}"),
                serde_json::json!({ "status": "pending" }),
            )
            .await
            .unwrap();
    }

    let keys = manager
        .list_namespace_keys("auth.qr.challenge", Some(2), None)
        .await
        .unwrap();

    assert_eq!(3, keys.scanned_items);
    assert!(!keys.scan_complete);
    assert_eq!(2, keys.returned_items);
    assert_eq!(Some(2), keys.limit);
    assert!(keys.has_more);
    assert_eq!("qr-page-1", keys.items[0].key);
    assert_eq!("qr-page-2", keys.items[1].key);
}

#[tokio::test]
async fn cache_namespace_key_listing_uses_opaque_cursor_for_next_page() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "desktop-default",
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    })
    .with_backend("desktop-default", Arc::new(LocalCacheBackend::new()));

    for index in 1..=5 {
        manager
            .set_json(
                "auth.qr.challenge",
                &format!("qr-cursor-{index}"),
                serde_json::json!({ "status": "pending" }),
            )
            .await
            .unwrap();
    }

    let first_page = manager
        .list_namespace_keys("auth.qr.challenge", Some(2), None)
        .await
        .unwrap();
    assert_eq!(3, first_page.scanned_items);
    assert_eq!(2, first_page.returned_items);
    assert!(first_page.has_more);
    assert!(!first_page.scan_complete);
    assert!(first_page.next_cursor.is_some());
    assert_eq!("qr-cursor-1", first_page.items[0].key);
    assert_eq!("qr-cursor-2", first_page.items[1].key);

    let second_page = manager
        .list_namespace_keys(
            "auth.qr.challenge",
            Some(2),
            first_page.next_cursor.as_deref(),
        )
        .await
        .unwrap();
    assert_eq!(3, second_page.scanned_items);
    assert_eq!(2, second_page.returned_items);
    assert!(second_page.has_more);
    assert!(!second_page.scan_complete);
    assert!(second_page.next_cursor.is_some());
    assert_eq!("qr-cursor-3", second_page.items[0].key);
    assert_eq!("qr-cursor-4", second_page.items[1].key);

    let final_page = manager
        .list_namespace_keys(
            "auth.qr.challenge",
            Some(2),
            second_page.next_cursor.as_deref(),
        )
        .await
        .unwrap();
    assert_eq!(1, final_page.scanned_items);
    assert_eq!(1, final_page.returned_items);
    assert!(!final_page.has_more);
    assert!(final_page.scan_complete);
    assert!(final_page.next_cursor.is_none());
    assert_eq!("qr-cursor-5", final_page.items[0].key);
}

#[tokio::test]
async fn cache_namespace_key_listing_rejects_expired_cursor() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "desktop-default",
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    })
    .with_key_list_cursor_ttl(Duration::from_millis(1))
    .with_backend("desktop-default", Arc::new(LocalCacheBackend::new()));

    for index in 1..=3 {
        manager
            .set_json(
                "auth.qr.challenge",
                &format!("qr-expiring-cursor-{index}"),
                serde_json::json!({ "status": "pending" }),
            )
            .await
            .unwrap();
    }

    let first_page = manager
        .list_namespace_keys("auth.qr.challenge", Some(1), None)
        .await
        .unwrap();
    let cursor = first_page
        .next_cursor
        .as_deref()
        .expect("first page must issue a continuation cursor");

    tokio::time::sleep(Duration::from_millis(5)).await;

    let error = manager
        .list_namespace_keys("auth.qr.challenge", Some(1), Some(cursor))
        .await
        .unwrap_err();

    assert!(error.to_string().contains("cache key list cursor expired"));
}

#[tokio::test]
async fn cache_writes_use_namespace_policy_ttl() {
    let clock = ManualClock::new();
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "desktop-default",
            1,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    })
    .with_backend(
        "desktop-default",
        Arc::new(LocalCacheBackend::with_max_entries_and_clock(None, {
            let clock = clock.clone();
            move || clock.now()
        })),
    );

    manager
        .set_json(
            "auth.qr.challenge",
            "policy-ttl",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();

    clock.advance(Duration::from_millis(1_100));

    assert!(manager
        .get_json("auth.qr.challenge", "policy-ttl")
        .await
        .unwrap()
        .is_none());
}

#[tokio::test]
async fn cache_writes_apply_namespace_policy_ttl_jitter() {
    let clock = ManualClock::new();
    let mut policy = CacheNamespacePolicy::new(
        "auth.qr.challenge",
        "desktop-default",
        1,
        "session",
        "sensitive",
        vec!["auth".to_owned(), "qr".to_owned()],
    );
    policy.jitter_percent = 100;
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![policy],
    })
    .with_backend(
        "desktop-default",
        Arc::new(LocalCacheBackend::with_max_entries_and_clock(None, {
            let clock = clock.clone();
            move || clock.now()
        })),
    );

    manager
        .set_json(
            "auth.qr.challenge",
            "policy-jitter",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();

    clock.advance(Duration::from_millis(1_100));
    assert!(manager
        .get_json("auth.qr.challenge", "policy-jitter")
        .await
        .unwrap()
        .is_some());

    clock.advance(Duration::from_millis(1_100));
    assert!(manager
        .get_json("auth.qr.challenge", "policy-jitter")
        .await
        .unwrap()
        .is_none());
}

#[tokio::test]
async fn local_cache_enforces_instance_max_entries() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "desktop-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(1),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "desktop-default",
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    });

    manager
        .set_json(
            "auth.qr.challenge",
            "oldest",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            "auth.qr.challenge",
            "newest",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();

    let snapshot = manager.snapshot().await.unwrap();
    assert_eq!(1, snapshot.instances[0].entry_count);
    assert!(manager
        .get_json("auth.qr.challenge", "oldest")
        .await
        .unwrap()
        .is_none());
    assert!(manager
        .get_json("auth.qr.challenge", "newest")
        .await
        .unwrap()
        .is_some());
}

#[tokio::test]
async fn runtime_target_enforces_local_cache_for_desktop_and_redis_cache_for_service() {
    let desktop_error = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::redis(
            "redis-default",
            "Service redis cache",
            "claw",
            120,
            "primary-redis",
        )],
        namespace_policies: Vec::new(),
    })
    .validate()
    .await
    .unwrap_err();
    assert!(desktop_error
        .to_string()
        .contains("desktop packaged runtime requires local cache"));

    let service_error = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::Service,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop default local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: Vec::new(),
    })
    .validate()
    .await
    .unwrap_err();
    assert!(service_error
        .to_string()
        .contains("service runtime requires redis cache"));
}

#[tokio::test]
async fn service_redis_cache_requires_connection_profile_name() {
    let mut redis_instance = CacheInstanceSpec::redis(
        "redis-default",
        "Service redis cache",
        "claw",
        120,
        DEFAULT_REDIS_CONNECTION_PROFILE_NAME,
    );
    redis_instance.connection_profile_name = None;
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::Service,
        instances: vec![redis_instance],
        namespace_policies: Vec::new(),
    })
    .with_backend("redis-default", Arc::new(LocalCacheBackend::new()));

    let error = manager.validate().await.unwrap_err();
    assert!(error
        .to_string()
        .contains("cache instance redis-default redis connection profile is required"));
}

#[tokio::test]
async fn service_redis_cache_requires_explicit_redis_backend_binding() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::Service,
        instances: vec![CacheInstanceSpec::redis(
            "redis-default",
            "Service redis cache",
            "claw",
            120,
            DEFAULT_REDIS_CONNECTION_PROFILE_NAME,
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "redis-default",
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    });

    let error = manager.snapshot().await.unwrap_err();
    assert!(error
        .to_string()
        .contains("cache instance redis-default has no backend"));
}

#[tokio::test]
async fn cache_operations_respect_instance_capability_flags() {
    let mut instance = CacheInstanceSpec::local(
        "local-default",
        "Desktop local cache",
        "claw",
        120,
        Some(10_000),
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
            120,
            "session",
            "sensitive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    });

    let refresh_error = manager.refresh_instance("local-default").await.unwrap_err();
    assert!(refresh_error
        .to_string()
        .contains("cache instance local-default does not support refresh"));

    let namespace_delete_error = manager
        .delete_namespace("auth.qr.challenge")
        .await
        .unwrap_err();
    assert!(namespace_delete_error
        .to_string()
        .contains("cache instance local-default does not support delete"));

    let key_delete_error = manager
        .delete_key("auth.qr.challenge", "qr-1")
        .await
        .unwrap_err();
    assert!(key_delete_error
        .to_string()
        .contains("cache instance local-default does not support delete"));

    let inspect_error = manager
        .list_namespace_keys("auth.qr.challenge", None, None)
        .await
        .unwrap_err();
    assert!(inspect_error
        .to_string()
        .contains("cache instance local-default does not support inspect"));
}

#[tokio::test]
async fn shared_redis_backend_stats_are_scoped_by_cache_instance_prefix() {
    let shared_backend = Arc::new(LocalCacheBackend::new());
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::Service,
        instances: vec![
            CacheInstanceSpec::redis(
                "redis-auth",
                "Auth redis cache",
                "claw:auth",
                120,
                DEFAULT_REDIS_CONNECTION_PROFILE_NAME,
            ),
            CacheInstanceSpec::redis(
                "redis-runtime",
                "Runtime redis cache",
                "claw:runtime",
                120,
                DEFAULT_REDIS_CONNECTION_PROFILE_NAME,
            ),
        ],
        namespace_policies: vec![
            CacheNamespacePolicy::new(
                "auth.qr.challenge",
                "redis-auth",
                120,
                "session",
                "sensitive",
                vec!["auth".to_owned(), "qr".to_owned()],
            ),
            CacheNamespacePolicy::new(
                "runtime.invocation",
                "redis-runtime",
                120,
                "tenant_user",
                "internal",
                vec!["runtime".to_owned()],
            ),
        ],
    })
    .with_backend("redis-auth", shared_backend.clone())
    .with_backend("redis-runtime", shared_backend);

    manager
        .set_json(
            "auth.qr.challenge",
            "qr-1",
            serde_json::json!({ "status": "pending" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            "runtime.invocation",
            "run-1",
            serde_json::json!({ "status": "running" }),
        )
        .await
        .unwrap();

    let snapshot = manager.snapshot().await.unwrap();

    let auth_instance = snapshot
        .instances
        .iter()
        .find(|instance| instance.name == "redis-auth")
        .unwrap();
    let runtime_instance = snapshot
        .instances
        .iter()
        .find(|instance| instance.name == "redis-runtime")
        .unwrap();
    assert_eq!(1, auth_instance.entry_count);
    assert_eq!(1, runtime_instance.entry_count);
    assert_eq!(2, snapshot.summary.total_entries);
}

#[tokio::test]
async fn cache_instance_key_prefixes_must_not_overlap() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::Service,
        instances: vec![
            CacheInstanceSpec::redis(
                "redis-default",
                "Service redis cache",
                "claw",
                120,
                DEFAULT_REDIS_CONNECTION_PROFILE_NAME,
            ),
            CacheInstanceSpec::redis(
                "redis-auth",
                "Auth redis cache",
                "claw:auth",
                120,
                DEFAULT_REDIS_CONNECTION_PROFILE_NAME,
            ),
        ],
        namespace_policies: Vec::new(),
    })
    .with_backend("redis-default", Arc::new(LocalCacheBackend::new()))
    .with_backend("redis-auth", Arc::new(LocalCacheBackend::new()));

    let error = manager.validate().await.unwrap_err();
    assert!(error
        .to_string()
        .contains("cache instance key prefixes must not overlap"));
}

#[tokio::test]
async fn cache_instance_key_prefix_must_be_normalized() {
    let manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop local cache",
            "claw:",
            120,
            Some(10_000),
        )],
        namespace_policies: Vec::new(),
    });

    let error = manager.validate().await.unwrap_err();
    assert!(error
        .to_string()
        .contains("cache instance local-default key prefix must not start or end with ':'"));
}

#[tokio::test]
async fn cache_namespace_policy_enforces_unique_namespace_scope_and_sensitivity() {
    let duplicate_namespace_manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![
            CacheNamespacePolicy::new(
                "auth.qr.challenge",
                "local-default",
                120,
                "session",
                "sensitive",
                vec!["auth".to_owned(), "qr".to_owned()],
            ),
            CacheNamespacePolicy::new(
                "auth.qr.challenge",
                "local-default",
                120,
                "session",
                "sensitive",
                vec!["auth".to_owned(), "qr".to_owned()],
            ),
        ],
    });
    let duplicate_error = duplicate_namespace_manager.validate().await.unwrap_err();
    assert!(duplicate_error
        .to_string()
        .contains("duplicate cache namespace: auth.qr.challenge"));

    let mut invalid_scope = CacheNamespacePolicy::new(
        "auth.qr.challenge",
        "local-default",
        120,
        "global-user",
        "sensitive",
        vec!["auth".to_owned(), "qr".to_owned()],
    );
    invalid_scope.sensitivity = "sensitive".to_owned();
    let invalid_scope_manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![invalid_scope],
    });
    let scope_error = invalid_scope_manager.validate().await.unwrap_err();
    assert!(scope_error
        .to_string()
        .contains("cache namespace auth.qr.challenge scope is unsupported"));

    let invalid_sensitivity_manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![CacheNamespacePolicy::new(
            "auth.qr.challenge",
            "local-default",
            120,
            "session",
            "secretive",
            vec!["auth".to_owned(), "qr".to_owned()],
        )],
    });
    let sensitivity_error = invalid_sensitivity_manager.validate().await.unwrap_err();
    assert!(sensitivity_error
        .to_string()
        .contains("cache namespace auth.qr.challenge sensitivity is unsupported"));
}

#[tokio::test]
async fn cache_namespace_policy_enforces_standard_failure_mode_and_consistency() {
    let mut invalid_failure_mode = CacheNamespacePolicy::new(
        "auth.qr.challenge",
        "local-default",
        120,
        "session",
        "sensitive",
        vec!["auth".to_owned(), "qr".to_owned()],
    );
    invalid_failure_mode.failure_mode = "silent_ignore".to_owned();
    let failure_mode_manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![invalid_failure_mode],
    });

    let failure_mode_error = failure_mode_manager.validate().await.unwrap_err();
    assert!(failure_mode_error
        .to_string()
        .contains("cache namespace auth.qr.challenge failure mode is unsupported"));

    let mut invalid_consistency = CacheNamespacePolicy::new(
        "auth.qr.challenge",
        "local-default",
        120,
        "session",
        "sensitive",
        vec!["auth".to_owned(), "qr".to_owned()],
    );
    invalid_consistency.consistency = "eventual".to_owned();
    let consistency_manager = RuntimeCacheManager::new(CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            "local-default",
            "Desktop local cache",
            "claw",
            120,
            Some(10_000),
        )],
        namespace_policies: vec![invalid_consistency],
    });

    let consistency_error = consistency_manager.validate().await.unwrap_err();
    assert!(consistency_error
        .to_string()
        .contains("cache namespace auth.qr.challenge consistency is unsupported"));
}
