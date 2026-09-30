//! Site settings read cache: process-local snapshot + cross-replica version stamp.
//!
//! `GET /backend/v3/api/system/site/settings` and
//! `GET /app/v3/api/system/site/runtime` are read on **every** portal page load, but
//! `PostgresSiteSettingsStore` answers each one with its own
//! `SELECT ... FROM ops_config_snapshot ... LIMIT 1` plus a JSON decode. With a
//! `SDKWORK_DATABASE_MAX_CONNECTIONS` pool of tens of connections, fan-out page loads
//! saturate the pool on what is really a single rarely-changing document.
//!
//! This decorator puts two tiers in front of the store:
//!
//! * **L1 — process local.** A `Mutex<HashMap>` holding cloned [`SiteSettings`]
//!   values. Hits are pure memory: no I/O, no decode, no lock contention beyond one
//!   short critical section. `SiteSettings` deliberately has no `serde` impl, so the
//!   snapshot cannot be parked in the shared JSON cache; that is why L1 is local.
//! * **L2 — shared version stamp.** A single `site.settings.version` key in the
//!   shared cache (Redis when more than one replica runs) holds an
//!   **epoch-microsecond stamp** published by whoever last wrote the document. Every
//!   replica compares its own snapshot stamp against this value, so a write on
//!   replica A invalidates replica B without waiting for a TTL and without a
//!   `SCAN`+`DEL` sweep.
//!
//! Why a timestamp and not a counter: the shared cache applies a TTL to every key, so
//! an `INCR`-based counter restarts at `1` when its key expires. A replica still
//! holding a snapshot stamped `1` from the previous epoch would then read the reset
//! counter as "unchanged" and serve pre-write content forever. Epoch microseconds
//! cannot wrap back into a previously observed epoch, and the writer forces the stamp
//! to be strictly greater than the last value it observed.
//!
//! Concurrency: concurrent cold reads of the same key are **coalesced** behind a
//! per-key async gate, so a thundering herd (site-settings write, then ten thousand
//! page loads) produces exactly one origin load instead of ten thousand queued
//! `SELECT`s waiting on an exhausted pool.
//!
//! Staleness bound: a replica that did not perform the write observes it within
//! `revalidate_interval` (default 1s). The local TTL (default 300s) is a safety net
//! for when the shared cache is unreachable, not the propagation mechanism.
//!
//! Failure posture: cache trouble never fails a read. A failed version probe keeps
//! serving the local snapshot and logs; a failed stamp publication leaves the write
//! successful (it already committed) and lets other replicas converge on the TTL.

use std::collections::HashMap;
use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde_json::json;
use tokio::sync::Mutex as AsyncMutex;

use super::{RuntimeCacheManager, SITE_SETTINGS_VERSION_CACHE_NAMESPACE};
use crate::ports::{
    GetSiteSettingsQuery, GetSiteSettingsScopeQuery, SiteSettings, SiteSettingsFuture,
    SiteSettingsStore, SiteSettingsSubject, UpdateSiteSettingsCommand,
};

/// Snapshot freshness window when the shared version stamp cannot be consulted.
pub const DEFAULT_SITE_SETTINGS_CACHE_TTL: Duration = Duration::from_secs(300);

/// How often a replica re-reads the shared version stamp. Bounds cross-replica
/// propagation latency and keeps the probe off the per-request hot path.
pub const DEFAULT_SITE_SETTINGS_CACHE_REVALIDATE_INTERVAL: Duration = Duration::from_millis(1_000);

/// Upper bound on cached scopes. Site settings is one document per tenant/organization,
/// so real deployments sit in the single digits; the cap only exists to bound memory
/// under hostile scope churn.
pub const DEFAULT_SITE_SETTINGS_CACHE_MAX_ENTRIES: usize = 4_096;

/// Cumulative counters for cache effectiveness and failure diagnosis.
#[derive(Debug, Default)]
pub struct SiteSettingsCacheMetrics {
    pub hits: AtomicU64,
    pub misses: AtomicU64,
    /// Reads that lost the coalescing race but were then served by the winner's fill.
    pub coalesced_waits: AtomicU64,
    pub origin_loads: AtomicU64,
    pub version_probes: AtomicU64,
    pub version_probe_errors: AtomicU64,
    pub stamp_publication_errors: AtomicU64,
    pub invalidations: AtomicU64,
}

impl SiteSettingsCacheMetrics {
    pub fn snapshot(&self) -> SiteSettingsCacheSnapshot {
        SiteSettingsCacheSnapshot {
            hits: self.hits.load(Ordering::Relaxed),
            misses: self.misses.load(Ordering::Relaxed),
            coalesced_waits: self.coalesced_waits.load(Ordering::Relaxed),
            origin_loads: self.origin_loads.load(Ordering::Relaxed),
            version_probes: self.version_probes.load(Ordering::Relaxed),
            version_probe_errors: self.version_probe_errors.load(Ordering::Relaxed),
            stamp_publication_errors: self.stamp_publication_errors.load(Ordering::Relaxed),
            invalidations: self.invalidations.load(Ordering::Relaxed),
        }
    }
}

/// Point-in-time copy of [`SiteSettingsCacheMetrics`].
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct SiteSettingsCacheSnapshot {
    pub hits: u64,
    pub misses: u64,
    pub coalesced_waits: u64,
    pub origin_loads: u64,
    pub version_probes: u64,
    pub version_probe_errors: u64,
    pub stamp_publication_errors: u64,
    pub invalidations: u64,
}

/// Cache identity of one site-settings document.
///
/// The admin surface reads by numeric subject; the app surface reads by tenant and
/// organization **code** and lets the store resolve codes to ids. The two therefore
/// key separately and may hold the same document twice — a bounded, harmless
/// duplication that avoids duplicating the code-to-id resolution here.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum SiteSettingsCacheKey {
    Subject {
        tenant_id: i64,
        organization_id: i64,
        operator_id: i64,
        operator_type: i32,
    },
    Scope {
        tenant_code: Option<String>,
        organization_code: Option<String>,
    },
}

impl SiteSettingsCacheKey {
    fn from_subject(subject: &SiteSettingsSubject) -> Self {
        Self::Subject {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            operator_id: subject.operator_id,
            operator_type: subject.operator_type,
        }
    }

    fn from_scope(query: &GetSiteSettingsScopeQuery) -> Self {
        Self::Scope {
            tenant_code: query.tenant_code.clone(),
            organization_code: query.organization_code.clone(),
        }
    }
}

struct SiteSettingsCacheEntry {
    value: SiteSettings,
    expires_at: Instant,
    /// Shared version stamp this snapshot was loaded under.
    stamp: i64,
}

/// Caching decorator over any [`SiteSettingsStore`].
pub struct CachedSiteSettingsStore {
    inner: Arc<dyn SiteSettingsStore + Send + Sync>,
    cache_manager: Option<RuntimeCacheManager>,
    cache: Mutex<HashMap<SiteSettingsCacheKey, SiteSettingsCacheEntry>>,
    /// Per-key gates, held across the origin load only. Callers that arrive while a
    /// load is in flight queue here and then re-check the cache instead of issuing
    /// their own query.
    gates: Mutex<HashMap<SiteSettingsCacheKey, Arc<AsyncMutex<()>>>>,
    ttl: Duration,
    revalidate_interval: Duration,
    max_entries: usize,
    observed_version: AtomicI64,
    last_version_probe: Mutex<Option<Instant>>,
    metrics: SiteSettingsCacheMetrics,
}

impl CachedSiteSettingsStore {
    /// Fixed key inside [`SITE_SETTINGS_VERSION_CACHE_NAMESPACE`] carrying the stamp.
    pub const VERSION_KEY: &'static str = "version";

    pub fn new(
        inner: Arc<dyn SiteSettingsStore + Send + Sync>,
        cache_manager: Option<RuntimeCacheManager>,
    ) -> Self {
        Self::with_options(
            inner,
            cache_manager,
            DEFAULT_SITE_SETTINGS_CACHE_TTL,
            DEFAULT_SITE_SETTINGS_CACHE_REVALIDATE_INTERVAL,
            DEFAULT_SITE_SETTINGS_CACHE_MAX_ENTRIES,
        )
    }

    /// Explicit tuning entrypoint. Tests use this to pin `revalidate_interval` to zero
    /// so version propagation is observable without sleeping.
    pub fn with_options(
        inner: Arc<dyn SiteSettingsStore + Send + Sync>,
        cache_manager: Option<RuntimeCacheManager>,
        ttl: Duration,
        revalidate_interval: Duration,
        max_entries: usize,
    ) -> Self {
        Self {
            inner,
            cache_manager,
            cache: Mutex::new(HashMap::new()),
            gates: Mutex::new(HashMap::new()),
            ttl,
            revalidate_interval,
            max_entries: max_entries.max(1),
            observed_version: AtomicI64::new(0),
            last_version_probe: Mutex::new(None),
            metrics: SiteSettingsCacheMetrics::default(),
        }
    }

    pub fn metrics(&self) -> &SiteSettingsCacheMetrics {
        &self.metrics
    }

    /// Last version stamp this replica observed in the shared cache.
    pub fn observed_version(&self) -> i64 {
        self.observed_version.load(Ordering::Acquire)
    }

    /// Number of live process-local snapshots.
    pub fn cached_entry_count(&self) -> usize {
        self.cache
            .lock()
            .expect("site settings cache poisoned")
            .len()
    }

    /// Drops every process-local snapshot without touching the shared stamp.
    pub fn invalidate_local(&self) {
        self.cache
            .lock()
            .expect("site settings cache poisoned")
            .clear();
    }

    /// Clears the local snapshot and publishes a fresh shared stamp after a write.
    ///
    /// The local map is cleared **before** the stamp is published so this process can
    /// never serve the pre-write document even if publication fails. A failed
    /// publication is counted and logged rather than returned: the write already
    /// committed, and reporting a cache failure as a failed write would be a lie.
    pub async fn invalidate_after_write(&self) -> i64 {
        self.invalidate_local();
        self.metrics.invalidations.fetch_add(1, Ordering::Relaxed);

        let Some(manager) = self.cache_manager.as_ref() else {
            // Local-only tier: clearing is the whole invalidation story.
            self.observed_version.store(0, Ordering::Release);
            return 0;
        };

        let previous = self.observed_version.load(Ordering::Acquire);
        let stamp = now_micros().max(previous.saturating_add(1));
        match manager
            .set_json(
                SITE_SETTINGS_VERSION_CACHE_NAMESPACE,
                Self::VERSION_KEY,
                json!(stamp),
            )
            .await
        {
            Ok(()) => {
                self.observed_version.store(stamp, Ordering::Release);
                // Record the publication as a probe so the throttled reader below does
                // not immediately re-read the value it just wrote.
                self.last_version_probe
                    .lock()
                    .expect("site settings version probe clock poisoned")
                    .replace(Instant::now());
            }
            Err(error) => {
                self.metrics
                    .stamp_publication_errors
                    .fetch_add(1, Ordering::Relaxed);
                tracing::warn!(
                    error = %error,
                    "site settings cache stamp publication failed; other replicas will converge on the local ttl"
                );
            }
        }
        stamp
    }

    /// Consults the shared version stamp, throttled to one probe per
    /// `revalidate_interval`. Returns the stamp this replica should treat as current.
    async fn current_version(&self) -> i64 {
        let Some(manager) = self.cache_manager.as_ref() else {
            return 0;
        };
        if !self.take_probe_slot() {
            return self.observed_version.load(Ordering::Acquire);
        }
        self.metrics.version_probes.fetch_add(1, Ordering::Relaxed);
        match manager
            .get_json(SITE_SETTINGS_VERSION_CACHE_NAMESPACE, Self::VERSION_KEY)
            .await
        {
            Ok(Some(value)) => {
                let stamp = value.as_i64().unwrap_or(0);
                self.observed_version.store(stamp, Ordering::Release);
                stamp
            }
            // An absent stamp means no write has published one (or it expired). Treat
            // it as epoch zero so a snapshot loaded under "no writer yet" keeps hitting.
            Ok(None) => {
                self.observed_version.store(0, Ordering::Release);
                0
            }
            // Unreachable shared cache: keep the last known stamp and let the local TTL
            // bound staleness instead of failing the read or spamming origin.
            Err(error) => {
                self.metrics
                    .version_probe_errors
                    .fetch_add(1, Ordering::Relaxed);
                tracing::warn!(
                    error = %error,
                    "site settings cache version probe failed; serving the local snapshot until its ttl"
                );
                self.observed_version.load(Ordering::Acquire)
            }
        }
    }

    /// Sync (non-awaiting) probe admission so no `std` guard is ever held across await.
    fn take_probe_slot(&self) -> bool {
        let mut last = self
            .last_version_probe
            .lock()
            .expect("site settings version probe clock poisoned");
        match *last {
            Some(previous) if previous.elapsed() < self.revalidate_interval => false,
            _ => {
                *last = Some(Instant::now());
                true
            }
        }
    }

    fn cached_entry(&self, key: &SiteSettingsCacheKey, version: i64) -> Option<SiteSettings> {
        let now = Instant::now();
        let mut cache = self.cache.lock().expect("site settings cache poisoned");
        match cache.get(key) {
            Some(entry) if entry.expires_at > now && entry.stamp == version => {
                let value = entry.value.clone();
                drop(cache);
                self.metrics.hits.fetch_add(1, Ordering::Relaxed);
                Some(value)
            }
            _ => {
                // Evict expired/out-of-version snapshots on the way past so a version
                // bump reclaims memory on the read that noticed it.
                cache.remove(key);
                drop(cache);
                self.metrics.misses.fetch_add(1, Ordering::Relaxed);
                None
            }
        }
    }

    fn store_entry(&self, key: &SiteSettingsCacheKey, value: SiteSettings, version: i64) {
        let now = Instant::now();
        let mut cache = self.cache.lock().expect("site settings cache poisoned");
        if cache.len() >= self.max_entries {
            cache.retain(|_, entry| entry.expires_at > now);
            if cache.len() >= self.max_entries {
                cache.clear();
            }
        }
        cache.insert(
            key.clone(),
            SiteSettingsCacheEntry {
                value,
                expires_at: now + self.ttl,
                stamp: version,
            },
        );
    }

    fn gate_for(&self, key: &SiteSettingsCacheKey) -> Arc<AsyncMutex<()>> {
        let mut gates = self.gates.lock().expect("site settings gate map poisoned");
        // The keyspace is one document per tenant/organization; only purge when a
        // pathological scope churn pushes the map past the entry cap.
        if gates.len() >= self.max_entries {
            gates.retain(|_, gate| Arc::strong_count(gate) > 1);
        }
        gates.entry(key.clone()).or_default().clone()
    }

    async fn read_through(
        &self,
        key: SiteSettingsCacheKey,
        load: impl std::future::Future<Output = crate::domain::DomainResult<SiteSettings>> + Send,
    ) -> crate::domain::DomainResult<SiteSettings> {
        let version = self.current_version().await;
        if let Some(value) = self.cached_entry(&key, version) {
            return Ok(value);
        }

        let gate = self.gate_for(&key);
        let _guard = gate.lock().await;
        // Double-checked: whoever held the gate before us may have just filled the
        // entry, in which case this read costs one map lookup and no query.
        if let Some(value) = self.cached_entry(&key, version) {
            self.metrics.coalesced_waits.fetch_add(1, Ordering::Relaxed);
            return Ok(value);
        }

        self.metrics.origin_loads.fetch_add(1, Ordering::Relaxed);
        let value = load.await?;
        self.store_entry(&key, value.clone(), version);
        Ok(value)
    }
}

impl SiteSettingsStore for CachedSiteSettingsStore {
    fn get_site_settings<'a>(
        &'a self,
        query: GetSiteSettingsQuery,
    ) -> SiteSettingsFuture<'a, SiteSettings> {
        Box::pin(async move {
            let key = SiteSettingsCacheKey::from_subject(&query.subject);
            self.read_through(key, self.inner.get_site_settings(query)).await
        })
    }

    fn get_site_settings_for_scope<'a>(
        &'a self,
        query: GetSiteSettingsScopeQuery,
    ) -> SiteSettingsFuture<'a, SiteSettings> {
        Box::pin(async move {
            let key = SiteSettingsCacheKey::from_scope(&query);
            self.read_through(key, self.inner.get_site_settings_for_scope(query))
                .await
        })
    }

    fn update_site_settings<'a>(
        &'a self,
        command: UpdateSiteSettingsCommand,
    ) -> SiteSettingsFuture<'a, SiteSettings> {
        Box::pin(async move {
            let settings = self.inner.update_site_settings(command).await?;
            self.invalidate_after_write().await;
            Ok(settings)
        })
    }
}

/// Decorates a site-settings store with the read cache.
///
/// `cache_manager` is optional so every assembly path keeps the origin-protection tier:
/// callers with access to the process-wide cache manager also get cross-replica
/// invalidation, and callers without one get a process-local TTL cache.
pub fn cached_site_settings_store(
    store: Arc<dyn SiteSettingsStore + Send + Sync>,
    cache_manager: Option<RuntimeCacheManager>,
) -> Arc<dyn SiteSettingsStore + Send + Sync> {
    Arc::new(CachedSiteSettingsStore::new(store, cache_manager))
}

fn now_micros() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()
        .and_then(|elapsed| i64::try_from(elapsed.as_micros()).ok())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::default_desktop_cache_manager;

    /// Origin stand-in that counts touches and can be made slow enough for concurrent
    /// callers to actually pile up on the gate.
    struct CountingStore {
        settings: SiteSettings,
        reads: AtomicU64,
        writes: AtomicU64,
        load_delay: Duration,
    }

    impl CountingStore {
        fn new(load_delay: Duration) -> Self {
            let mut settings = SiteSettings::default();
            settings.site_name = "Origin Brand".to_owned();
            Self {
                settings,
                reads: AtomicU64::new(0),
                writes: AtomicU64::new(0),
                load_delay,
            }
        }

        fn reads(&self) -> u64 {
            self.reads.load(Ordering::SeqCst)
        }

        fn writes(&self) -> u64 {
            self.writes.load(Ordering::SeqCst)
        }
    }

    impl SiteSettingsStore for CountingStore {
        fn get_site_settings<'a>(
            &'a self,
            _query: GetSiteSettingsQuery,
        ) -> SiteSettingsFuture<'a, SiteSettings> {
            Box::pin(async move {
                self.reads.fetch_add(1, Ordering::SeqCst);
                if !self.load_delay.is_zero() {
                    tokio::time::sleep(self.load_delay).await;
                }
                Ok(self.settings.clone())
            })
        }

        fn get_site_settings_for_scope<'a>(
            &'a self,
            _query: GetSiteSettingsScopeQuery,
        ) -> SiteSettingsFuture<'a, SiteSettings> {
            Box::pin(async move {
                self.reads.fetch_add(1, Ordering::SeqCst);
                if !self.load_delay.is_zero() {
                    tokio::time::sleep(self.load_delay).await;
                }
                Ok(self.settings.clone())
            })
        }

        fn update_site_settings<'a>(
            &'a self,
            _command: UpdateSiteSettingsCommand,
        ) -> SiteSettingsFuture<'a, SiteSettings> {
            Box::pin(async move {
                self.writes.fetch_add(1, Ordering::SeqCst);
                Ok(self.settings.clone())
            })
        }
    }

    fn subject_query() -> GetSiteSettingsQuery {
        GetSiteSettingsQuery {
            subject: SiteSettingsSubject {
                tenant_id: 7,
                organization_id: 0,
                operator_id: 1,
                operator_type: 1,
            },
        }
    }

    fn scope_query() -> GetSiteSettingsScopeQuery {
        GetSiteSettingsScopeQuery {
            tenant_code: Some("acme".to_owned()),
            organization_code: None,
        }
    }

    fn decoy_command() -> UpdateSiteSettingsCommand {
        UpdateSiteSettingsCommand {
            subject: SiteSettingsSubject {
                tenant_id: 7,
                organization_id: 0,
                operator_id: 1,
                operator_type: 1,
            },
            audit_log_uuid: "audit-1".to_owned(),
            config_snapshot_uuid: "snapshot-1".to_owned(),
            settings: SiteSettings::default(),
            request_id: "request-1".to_owned(),
            requested_at: "2026-09-22T00:00:00Z".to_owned(),
        }
    }

    type AnyStore = Arc<dyn SiteSettingsStore + Send + Sync>;

    fn build(
        inner: Arc<CountingStore>,
        manager: Option<RuntimeCacheManager>,
        revalidate_interval: Duration,
        ttl: Duration,
    ) -> (Arc<CachedSiteSettingsStore>, AnyStore) {
        let cached = Arc::new(CachedSiteSettingsStore::with_options(
            inner,
            manager,
            ttl,
            revalidate_interval,
            DEFAULT_SITE_SETTINGS_CACHE_MAX_ENTRIES,
        ));
        let erased: AnyStore = cached.clone();
        (cached, erased)
    }

    #[tokio::test]
    async fn repeated_reads_are_served_from_the_process_local_snapshot() {
        let inner = Arc::new(CountingStore::new(Duration::ZERO));
        let (cached, store) = build(
            inner.clone(),
            None,
            DEFAULT_SITE_SETTINGS_CACHE_REVALIDATE_INTERVAL,
            DEFAULT_SITE_SETTINGS_CACHE_TTL,
        );

        for _ in 0..25 {
            let settings = store.get_site_settings(subject_query()).await.unwrap();
            assert_eq!("Origin Brand", settings.site_name);
        }

        assert_eq!(1, inner.reads(), "25 reads must collapse to one origin load");
        let metrics = cached.metrics().snapshot();
        assert_eq!(1, metrics.origin_loads);
        assert_eq!(24, metrics.hits);
    }

    #[tokio::test]
    async fn concurrent_cold_reads_coalesce_into_a_single_origin_load() {
        let inner = Arc::new(CountingStore::new(Duration::from_millis(50)));
        let (_cached, store) = build(
            inner.clone(),
            None,
            DEFAULT_SITE_SETTINGS_CACHE_REVALIDATE_INTERVAL,
            DEFAULT_SITE_SETTINGS_CACHE_TTL,
        );

        let mut handles = Vec::new();
        for _ in 0..32 {
            let store = store.clone();
            handles.push(tokio::spawn(async move {
                store.get_site_settings(subject_query()).await.unwrap()
            }));
        }
        for handle in handles {
            handle.await.unwrap();
        }

        assert_eq!(
            1,
            inner.reads(),
            "a thundering herd must not queue 32 queries against the pool"
        );
    }

    #[tokio::test]
    async fn scope_and_subject_reads_do_not_alias() {
        let inner = Arc::new(CountingStore::new(Duration::ZERO));
        let (_cached, store) = build(
            inner.clone(),
            None,
            DEFAULT_SITE_SETTINGS_CACHE_REVALIDATE_INTERVAL,
            DEFAULT_SITE_SETTINGS_CACHE_TTL,
        );

        store.get_site_settings(subject_query()).await.unwrap();
        store.get_site_settings_for_scope(scope_query()).await.unwrap();
        store.get_site_settings(subject_query()).await.unwrap();
        store.get_site_settings_for_scope(scope_query()).await.unwrap();

        assert_eq!(2, inner.reads(), "each cache identity keeps its own snapshot");
    }

    #[tokio::test]
    async fn expired_snapshots_reload_from_origin() {
        let inner = Arc::new(CountingStore::new(Duration::ZERO));
        let (_cached, store) = build(
            inner.clone(),
            None,
            DEFAULT_SITE_SETTINGS_CACHE_REVALIDATE_INTERVAL,
            Duration::from_millis(5),
        );

        store.get_site_settings(subject_query()).await.unwrap();
        tokio::time::sleep(Duration::from_millis(30)).await;
        store.get_site_settings(subject_query()).await.unwrap();

        assert_eq!(2, inner.reads());
    }

    #[tokio::test]
    async fn writes_clear_the_local_snapshot_and_publish_a_shared_stamp() {
        let manager = default_desktop_cache_manager();
        let inner = Arc::new(CountingStore::new(Duration::ZERO));
        let (cached, store) = build(
            inner.clone(),
            Some(manager.clone()),
            DEFAULT_SITE_SETTINGS_CACHE_REVALIDATE_INTERVAL,
            DEFAULT_SITE_SETTINGS_CACHE_TTL,
        );

        store.get_site_settings(subject_query()).await.unwrap();
        assert_eq!(1, inner.reads());

        // A read that arrives after the write must not be served the pre-write snapshot.
        store.update_site_settings(decoy_command()).await.unwrap();
        assert_eq!(0, cached.cached_entry_count());
        assert!(cached.observed_version() > 0);

        let published = manager
            .get_json(
                SITE_SETTINGS_VERSION_CACHE_NAMESPACE,
                CachedSiteSettingsStore::VERSION_KEY,
            )
            .await
            .unwrap();
        assert_eq!(
            Some(cached.observed_version()),
            published.and_then(|value| value.as_i64())
        );

        store.get_site_settings(subject_query()).await.unwrap();
        assert_eq!(2, inner.reads());
    }

    #[tokio::test]
    async fn a_stamp_published_elsewhere_evicts_the_local_snapshot() {
        let manager = default_desktop_cache_manager();
        let inner = Arc::new(CountingStore::new(Duration::ZERO));
        let (cached, store) = build(
            inner.clone(),
            Some(manager.clone()),
            // Zero throttle makes the propagation bound observable without sleeping.
            Duration::ZERO,
            DEFAULT_SITE_SETTINGS_CACHE_TTL,
        );

        store.get_site_settings(subject_query()).await.unwrap();
        assert_eq!(1, inner.reads());

        // Another replica wrote the document and published a newer stamp.
        let external = cached.observed_version().saturating_add(1_000_000);
        manager
            .set_json(
                SITE_SETTINGS_VERSION_CACHE_NAMESPACE,
                CachedSiteSettingsStore::VERSION_KEY,
                json!(external),
            )
            .await
            .unwrap();

        store.get_site_settings(subject_query()).await.unwrap();
        assert_eq!(
            2,
            inner.reads(),
            "a stamp from another replica must evict the local snapshot"
        );
        assert_eq!(external, cached.observed_version());
    }

    #[tokio::test]
    async fn an_unreachable_version_probe_degrades_instead_of_failing() {
        // A manager whose namespace policy is disabled cannot serve a stamp; the read
        // must still succeed from the local tier.
        let inner = Arc::new(CountingStore::new(Duration::ZERO));
        let (cached, store) = build(
            inner.clone(),
            Some(default_desktop_cache_manager()),
            Duration::ZERO,
            DEFAULT_SITE_SETTINGS_CACHE_TTL,
        );

        assert!(store.get_site_settings(subject_query()).await.is_ok());
        assert!(store.get_site_settings(subject_query()).await.is_ok());
        assert_eq!(1, inner.reads());
        assert_eq!(0, cached.metrics().snapshot().version_probe_errors);
    }
}
