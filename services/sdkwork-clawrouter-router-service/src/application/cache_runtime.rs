use std::collections::hash_map::DefaultHasher;
use std::collections::BTreeMap;
use std::fmt;
use std::hash::{Hash, Hasher};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use hmac::{Hmac, Mac};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use tokio::sync::RwLock;

use crate::domain::{DomainError, DomainResult};

pub const AUTH_QR_CACHE_NAMESPACE: &str = "auth.qr.challenge";
pub const ROUTING_SNAPSHOT_CACHE_NAMESPACE: &str = "routing.snapshot";
pub const ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE: &str = "routing.provider_object_route";
pub const ROUTING_IDEMPOTENCY_CACHE_NAMESPACE: &str = "routing.idempotency";
pub const ROUTING_CONFIG_VERSION_CACHE_NAMESPACE: &str = "routing.config_version";
pub const ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE: &str = "routing.disabled_channel";
pub const DEFAULT_DESKTOP_CACHE_INSTANCE_NAME: &str = "local-default";
pub const DEFAULT_SERVICE_CACHE_INSTANCE_NAME: &str = "redis-default";
pub const DEFAULT_CACHE_KEY_PREFIX: &str = "claw";
pub const DEFAULT_REDIS_CONNECTION_PROFILE_NAME: &str = "primary-redis";
const CACHE_FAILURE_MODES: [&str; 4] = [
    "fail_closed",
    "origin_fallback",
    "serve_stale",
    "bypass_cache",
];
const CACHE_CONSISTENCY_LEVELS: [&str; 3] = ["relaxed", "bounded_stale", "coordination_critical"];
const CACHE_SCOPES: [&str; 6] = [
    "global",
    "tenant",
    "tenant_user",
    "user",
    "session",
    "request",
];
const CACHE_SENSITIVITIES: [&str; 5] = ["public", "internal", "private", "sensitive", "credential"];
const CACHE_KEY_LIST_CURSOR_VERSION: u8 = 1;
const DEFAULT_CACHE_KEY_LIST_CURSOR_TTL: Duration = Duration::from_secs(300);
pub const DEFAULT_CACHE_KEY_LIST_LIMIT: usize = 200;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CacheProviderKind {
    LocalCache,
    RedisCache,
}

impl CacheProviderKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::LocalCache => "local_cache",
            Self::RedisCache => "redis_cache",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CacheRuntimeTarget {
    DesktopPackaged,
    Service,
}

impl CacheRuntimeTarget {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::DesktopPackaged => "desktop_packaged",
            Self::Service => "service",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheInstanceSpec {
    pub name: String,
    pub provider_kind: CacheProviderKind,
    pub purpose: String,
    pub key_prefix: String,
    pub default_ttl_seconds: u64,
    pub max_entries: Option<usize>,
    pub connection_profile_name: Option<String>,
    pub supports_inspect: bool,
    pub supports_refresh: bool,
    pub supports_delete: bool,
}

impl CacheInstanceSpec {
    pub fn local(
        name: impl Into<String>,
        purpose: impl Into<String>,
        key_prefix: impl Into<String>,
        default_ttl_seconds: u64,
        max_entries: Option<usize>,
    ) -> Self {
        Self {
            name: name.into(),
            provider_kind: CacheProviderKind::LocalCache,
            purpose: purpose.into(),
            key_prefix: key_prefix.into(),
            default_ttl_seconds,
            max_entries,
            connection_profile_name: None,
            supports_inspect: true,
            supports_refresh: true,
            supports_delete: true,
        }
    }

    pub fn redis(
        name: impl Into<String>,
        purpose: impl Into<String>,
        key_prefix: impl Into<String>,
        default_ttl_seconds: u64,
        connection_profile_name: impl Into<String>,
    ) -> Self {
        Self {
            name: name.into(),
            provider_kind: CacheProviderKind::RedisCache,
            purpose: purpose.into(),
            key_prefix: key_prefix.into(),
            default_ttl_seconds,
            max_entries: None,
            connection_profile_name: Some(connection_profile_name.into()),
            supports_inspect: true,
            supports_refresh: true,
            supports_delete: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheNamespacePolicy {
    pub namespace: String,
    pub instance_name: String,
    pub ttl_seconds: u64,
    pub scope: String,
    pub sensitivity: String,
    pub failure_mode: String,
    pub consistency: String,
    pub jitter_percent: u8,
    pub stale_while_revalidate_seconds: u64,
    pub tags: Vec<String>,
    pub enabled: bool,
}

impl CacheNamespacePolicy {
    pub fn new(
        namespace: impl Into<String>,
        instance_name: impl Into<String>,
        ttl_seconds: u64,
        scope: impl Into<String>,
        sensitivity: impl Into<String>,
        tags: Vec<String>,
    ) -> Self {
        Self {
            namespace: namespace.into(),
            instance_name: instance_name.into(),
            ttl_seconds,
            scope: scope.into(),
            sensitivity: sensitivity.into(),
            failure_mode: "fail_closed".to_owned(),
            consistency: "coordination_critical".to_owned(),
            jitter_percent: 0,
            stale_while_revalidate_seconds: 0,
            tags,
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheRuntime {
    pub runtime_target: CacheRuntimeTarget,
    pub instances: Vec<CacheInstanceSpec>,
    pub namespace_policies: Vec<CacheNamespacePolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheInstanceSnapshot {
    pub name: String,
    pub provider_kind: CacheProviderKind,
    pub purpose: String,
    pub key_prefix: String,
    pub default_ttl_seconds: u64,
    pub max_entries: Option<usize>,
    pub connection_profile_name: Option<String>,
    pub supports_inspect: bool,
    pub supports_refresh: bool,
    pub supports_delete: bool,
    pub entry_count: usize,
    pub expired_entry_count: usize,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub cache_writes: u64,
    pub cache_deletes: u64,
    pub cache_refreshes: u64,
    pub cache_inspections: u64,
    pub cache_errors: u64,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheRuntimeSummary {
    pub runtime_target: CacheRuntimeTarget,
    pub total_instances: usize,
    pub total_namespaces: usize,
    pub total_entries: usize,
    pub expired_entries: usize,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub cache_writes: u64,
    pub cache_deletes: u64,
    pub cache_refreshes: u64,
    pub cache_inspections: u64,
    pub cache_errors: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheRuntimeSnapshot {
    pub summary: CacheRuntimeSummary,
    pub instances: Vec<CacheInstanceSnapshot>,
    pub namespace_policies: Vec<CacheNamespacePolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheOperationOutcome {
    pub operation: String,
    pub instance_name: Option<String>,
    pub namespace: Option<String>,
    pub cache_key: Option<String>,
    pub deleted_entries: usize,
    pub refreshed_entries: usize,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheKeyMetadata {
    pub key: String,
    pub namespace: String,
    pub instance_name: String,
    pub status: String,
    pub expires_in_seconds: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheNamespaceKeyList {
    pub namespace: String,
    pub instance_name: String,
    pub scanned_items: usize,
    pub returned_items: usize,
    pub page_size: Option<usize>,
    pub has_more: bool,
    pub scan_complete: bool,
    pub next_cursor: Option<String>,
    pub items: Vec<CacheKeyMetadata>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CacheBackendKeyMetadata {
    pub key: String,
    pub status: String,
    pub expires_in_seconds: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CacheBackendKeyList {
    pub scanned_items: usize,
    pub scan_complete: bool,
    pub next_cursor: Option<CacheBackendCursor>,
    pub items: Vec<CacheBackendKeyMetadata>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "backend")]
pub enum CacheBackendCursor {
    Local { offset: usize },
    Redis { scan_cursor: u64, offset: usize },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct CacheKeyListCursorPayload {
    version: u8,
    scope_hash: String,
    issued_at_unix_ms: u128,
    cursor: CacheBackendCursor,
}

#[derive(Debug, Clone)]
struct CacheValueEntry {
    value: Value,
    inserted_at: Instant,
    expires_at: Instant,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct CacheBackendStats {
    pub entry_count: usize,
    pub expired_entry_count: usize,
}

pub trait CacheBackend: Send + Sync {
    fn get_json<'a>(&'a self, key: &'a str) -> CacheBackendFuture<'a, Option<Value>>;
    fn set_json<'a>(
        &'a self,
        key: String,
        value: Value,
        ttl: Duration,
    ) -> CacheBackendFuture<'a, ()>;
    fn delete<'a>(&'a self, key: &'a str) -> CacheBackendFuture<'a, bool>;
    fn delete_prefix<'a>(&'a self, prefix: String) -> CacheBackendFuture<'a, usize>;
    fn refresh_prefix<'a>(
        &'a self,
        prefix: String,
    ) -> CacheBackendFuture<'a, CacheOperationOutcome>;
    fn stats_prefix<'a>(&'a self, prefix: String) -> CacheBackendFuture<'a, CacheBackendStats>;
    fn list_prefix<'a>(
        &'a self,
        prefix: String,
        page_size: Option<usize>,
        cursor: Option<CacheBackendCursor>,
    ) -> CacheBackendFuture<'a, CacheBackendKeyList>;
}

pub type CacheBackendFuture<'a, T> =
    std::pin::Pin<Box<dyn std::future::Future<Output = DomainResult<T>> + Send + 'a>>;

type MonotonicNow = Arc<dyn Fn() -> Instant + Send + Sync>;

pub struct LocalCacheBackend {
    entries: RwLock<BTreeMap<String, CacheValueEntry>>,
    max_entries: Option<usize>,
    now: MonotonicNow,
}

impl fmt::Debug for LocalCacheBackend {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("LocalCacheBackend")
            .field("max_entries", &self.max_entries)
            .finish_non_exhaustive()
    }
}

impl Default for LocalCacheBackend {
    fn default() -> Self {
        Self::with_max_entries(None)
    }
}

impl LocalCacheBackend {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_max_entries(max_entries: Option<usize>) -> Self {
        Self::with_max_entries_and_clock(max_entries, Instant::now)
    }

    pub fn with_max_entries_and_clock(
        max_entries: Option<usize>,
        now: impl Fn() -> Instant + Send + Sync + 'static,
    ) -> Self {
        Self {
            entries: RwLock::new(BTreeMap::new()),
            max_entries,
            now: Arc::new(now),
        }
    }
}

impl CacheBackend for LocalCacheBackend {
    fn get_json<'a>(&'a self, key: &'a str) -> CacheBackendFuture<'a, Option<Value>> {
        Box::pin(async move {
            let mut entries = self.entries.write().await;
            let Some(entry) = entries.get(key) else {
                return Ok(None);
            };
            if entry.expires_at <= (self.now.as_ref())() {
                entries.remove(key);
                return Ok(None);
            }
            Ok(Some(entry.value.clone()))
        })
    }

    fn set_json<'a>(
        &'a self,
        key: String,
        value: Value,
        ttl: Duration,
    ) -> CacheBackendFuture<'a, ()> {
        Box::pin(async move {
            let inserted_at = (self.now.as_ref())();
            let expires_at = inserted_at
                .checked_add(ttl)
                .ok_or_else(|| DomainError::new("cache ttl overflowed"))?;
            let mut entries = self.entries.write().await;
            entries.insert(
                key,
                CacheValueEntry {
                    value,
                    inserted_at,
                    expires_at,
                },
            );
            if let Some(max_entries) = self.max_entries {
                while entries.len() > max_entries {
                    let Some(oldest_key) = entries
                        .iter()
                        .min_by_key(|(_, entry)| entry.inserted_at)
                        .map(|(entry_key, _)| entry_key.clone())
                    else {
                        break;
                    };
                    entries.remove(&oldest_key);
                }
            }
            Ok(())
        })
    }

    fn delete<'a>(&'a self, key: &'a str) -> CacheBackendFuture<'a, bool> {
        Box::pin(async move { Ok(self.entries.write().await.remove(key).is_some()) })
    }

    fn delete_prefix<'a>(&'a self, prefix: String) -> CacheBackendFuture<'a, usize> {
        Box::pin(async move {
            let mut entries = self.entries.write().await;
            let before = entries.len();
            entries.retain(|key, _| !key.starts_with(&prefix));
            Ok(before.saturating_sub(entries.len()))
        })
    }

    fn refresh_prefix<'a>(
        &'a self,
        prefix: String,
    ) -> CacheBackendFuture<'a, CacheOperationOutcome> {
        Box::pin(async move {
            let now = (self.now.as_ref())();
            let mut entries = self.entries.write().await;
            let before = entries.len();
            entries.retain(|key, entry| !key.starts_with(&prefix) || entry.expires_at > now);
            let refreshed_entries = entries
                .iter()
                .filter(|(key, entry)| key.starts_with(&prefix) && entry.expires_at > now)
                .count();
            Ok(CacheOperationOutcome {
                operation: "refresh".to_owned(),
                instance_name: None,
                namespace: None,
                cache_key: None,
                deleted_entries: before.saturating_sub(entries.len()),
                refreshed_entries,
                status: "completed".to_owned(),
            })
        })
    }

    fn stats_prefix<'a>(&'a self, prefix: String) -> CacheBackendFuture<'a, CacheBackendStats> {
        Box::pin(async move {
            let entries = self.entries.read().await;
            let now = (self.now.as_ref())();
            let expired_entry_count = entries
                .iter()
                .filter(|(key, entry)| key.starts_with(&prefix) && entry.expires_at <= now)
                .count();
            let active_entry_count = entries
                .iter()
                .filter(|(key, entry)| key.starts_with(&prefix) && entry.expires_at > now)
                .count();
            Ok(CacheBackendStats {
                entry_count: active_entry_count,
                expired_entry_count,
            })
        })
    }

    fn list_prefix<'a>(
        &'a self,
        prefix: String,
        page_size: Option<usize>,
        cursor: Option<CacheBackendCursor>,
    ) -> CacheBackendFuture<'a, CacheBackendKeyList> {
        Box::pin(async move {
            let start_offset = match cursor {
                Some(CacheBackendCursor::Local { offset }) => offset,
                Some(CacheBackendCursor::Redis { .. }) => {
                    return Err(DomainError::conflict("cache key list cursor is invalid"));
                }
                None => 0,
            };
            let entries = self.entries.read().await;
            let now = (self.now.as_ref())();
            let matched_items: Vec<CacheBackendKeyMetadata> = entries
                .iter()
                .filter_map(|(key, entry)| {
                    key.strip_prefix(&prefix).map(|logical_key| {
                        let expires_in_seconds = entry
                            .expires_at
                            .checked_duration_since(now)
                            .map(|duration| duration.as_secs().max(1));
                        CacheBackendKeyMetadata {
                            key: logical_key.to_owned(),
                            status: if expires_in_seconds.is_some() {
                                "active".to_owned()
                            } else {
                                "expired".to_owned()
                            },
                            expires_in_seconds,
                        }
                    })
                })
                .skip(start_offset)
                .take(
                    page_size
                        .or(Some(DEFAULT_CACHE_KEY_LIST_LIMIT))
                        .map(|value| value.saturating_add(1))
                        .unwrap_or(DEFAULT_CACHE_KEY_LIST_LIMIT.saturating_add(1)),
                )
                .collect();
            let has_more = page_size
                .or(Some(DEFAULT_CACHE_KEY_LIST_LIMIT))
                .map(|value| matched_items.len() > value)
                .unwrap_or(false);
            let items: Vec<CacheBackendKeyMetadata> = matched_items
                .into_iter()
                .take(page_size.unwrap_or(DEFAULT_CACHE_KEY_LIST_LIMIT))
                .collect();
            let next_cursor = if has_more {
                Some(CacheBackendCursor::Local {
                    offset: start_offset.saturating_add(items.len()),
                })
            } else {
                None
            };
            Ok(CacheBackendKeyList {
                scanned_items: if has_more {
                    page_size.unwrap_or_default().saturating_add(1)
                } else {
                    items.len()
                },
                scan_complete: !has_more,
                next_cursor,
                items,
            })
        })
    }
}

#[derive(Clone)]
pub struct RedisCacheBackend {
    client: redis::Client,
    command_timeout: Duration,
}

impl RedisCacheBackend {
    pub fn new(redis_url: impl AsRef<str>) -> DomainResult<Self> {
        Self::with_command_timeout(redis_url, Duration::from_secs(1))
    }

    pub fn with_command_timeout(
        redis_url: impl AsRef<str>,
        command_timeout: Duration,
    ) -> DomainResult<Self> {
        let client = redis::Client::open(redis_url.as_ref())
            .map_err(|error| DomainError::new(format!("redis cache url is invalid: {error}")))?;
        Ok(Self {
            client,
            command_timeout,
        })
    }

    async fn connection(&self) -> DomainResult<redis::aio::ConnectionManager> {
        tokio::time::timeout(self.command_timeout, self.client.get_connection_manager())
            .await
            .map_err(|_| DomainError::new("redis cache connection timed out"))?
            .map_err(|error| DomainError::new(format!("redis cache connection failed: {error}")))
    }

    async fn with_timeout<T>(
        &self,
        future: impl std::future::Future<Output = redis::RedisResult<T>>,
        context: &str,
    ) -> DomainResult<T> {
        tokio::time::timeout(self.command_timeout, future)
            .await
            .map_err(|_| DomainError::new(format!("{context} timed out")))?
            .map_err(|error| DomainError::new(format!("{context} failed: {error}")))
    }
}

impl CacheBackend for RedisCacheBackend {
    fn get_json<'a>(&'a self, key: &'a str) -> CacheBackendFuture<'a, Option<Value>> {
        Box::pin(async move {
            let mut connection = self.connection().await?;
            let raw: Option<String> = self
                .with_timeout(connection.get(key), "redis cache get")
                .await?;
            raw.map(|value| {
                serde_json::from_str(&value).map_err(|error| {
                    DomainError::new(format!("redis cache value is invalid json: {error}"))
                })
            })
            .transpose()
        })
    }

    fn set_json<'a>(
        &'a self,
        key: String,
        value: Value,
        ttl: Duration,
    ) -> CacheBackendFuture<'a, ()> {
        Box::pin(async move {
            let ttl_seconds = ttl.as_secs().max(1);
            let payload = serde_json::to_string(&value).map_err(|error| {
                DomainError::new(format!("redis cache value serialization failed: {error}"))
            })?;
            let mut connection = self.connection().await?;
            self.with_timeout(
                connection.set_ex::<_, _, ()>(key, payload, ttl_seconds),
                "redis cache set",
            )
            .await
        })
    }

    fn delete<'a>(&'a self, key: &'a str) -> CacheBackendFuture<'a, bool> {
        Box::pin(async move {
            let mut connection = self.connection().await?;
            let deleted: usize = self
                .with_timeout(connection.del(key), "redis cache delete")
                .await?;
            Ok(deleted > 0)
        })
    }

    fn delete_prefix<'a>(&'a self, prefix: String) -> CacheBackendFuture<'a, usize> {
        Box::pin(async move {
            let keys = self.scan_keys(format!("{prefix}*")).await?;
            if keys.is_empty() {
                return Ok(0);
            }
            let mut connection = self.connection().await?;
            self.with_timeout(connection.del(keys), "redis cache delete prefix")
                .await
        })
    }

    fn refresh_prefix<'a>(
        &'a self,
        prefix: String,
    ) -> CacheBackendFuture<'a, CacheOperationOutcome> {
        Box::pin(async move {
            let stats = self.stats_prefix(prefix).await?;
            Ok(CacheOperationOutcome {
                operation: "refresh".to_owned(),
                instance_name: None,
                namespace: None,
                cache_key: None,
                deleted_entries: 0,
                refreshed_entries: stats.entry_count,
                status: "completed".to_owned(),
            })
        })
    }

    fn stats_prefix<'a>(&'a self, prefix: String) -> CacheBackendFuture<'a, CacheBackendStats> {
        Box::pin(async move {
            let keys = self.scan_keys(format!("{prefix}*")).await?;
            Ok(CacheBackendStats {
                entry_count: keys.len(),
                expired_entry_count: 0,
            })
        })
    }

    fn list_prefix<'a>(
        &'a self,
        prefix: String,
        page_size: Option<usize>,
        cursor: Option<CacheBackendCursor>,
    ) -> CacheBackendFuture<'a, CacheBackendKeyList> {
        Box::pin(async move {
            let page = self
                .scan_keys_page(format!("{prefix}*"), page_size, cursor)
                .await?;
            let mut connection = self.connection().await?;
            let mut items = Vec::with_capacity(page.keys.len());
            for key in page.keys {
                let ttl: i64 = self
                    .with_timeout(
                        redis::cmd("TTL").arg(&key).query_async(&mut connection),
                        "redis cache ttl",
                    )
                    .await?;
                if ttl == -2 {
                    continue;
                }
                let Some(logical_key) = key.strip_prefix(&prefix) else {
                    continue;
                };
                items.push(CacheBackendKeyMetadata {
                    key: logical_key.to_owned(),
                    status: "active".to_owned(),
                    expires_in_seconds: u64::try_from(ttl).ok(),
                });
            }
            Ok(CacheBackendKeyList {
                scanned_items: page.scanned_items,
                scan_complete: page.scan_complete,
                next_cursor: page.next_cursor,
                items,
            })
        })
    }
}

impl RedisCacheBackend {
    async fn scan_keys(&self, pattern: String) -> DomainResult<Vec<String>> {
        self.scan_keys_limited(pattern, None).await
    }

    async fn scan_keys_limited(
        &self,
        pattern: String,
        page_size: Option<usize>,
    ) -> DomainResult<Vec<String>> {
        let mut connection = self.connection().await?;
        self.with_timeout(
            async move {
                let mut cursor: u64 = 0;
                let mut keys = Vec::new();
                loop {
                    let (next_cursor, batch): (u64, Vec<String>) = redis::cmd("SCAN")
                        .cursor_arg(cursor)
                        .arg("MATCH")
                        .arg(pattern.as_str())
                        .arg("COUNT")
                        .arg(500_u32)
                        .query_async(&mut connection)
                        .await?;
                    keys.extend(batch);
                    if page_size
                        .map(|max_items| keys.len() >= max_items)
                        .unwrap_or(false)
                    {
                        keys.truncate(page_size.unwrap_or(keys.len()));
                        break;
                    }
                    if next_cursor == 0 {
                        break;
                    }
                    cursor = next_cursor;
                }
                Ok(keys)
            },
            "redis cache scan",
        )
        .await
    }

    async fn scan_keys_page(
        &self,
        pattern: String,
        page_size: Option<usize>,
        cursor: Option<CacheBackendCursor>,
    ) -> DomainResult<RedisScanKeyPage> {
        let (scan_cursor, offset) = match cursor {
            Some(CacheBackendCursor::Redis {
                scan_cursor,
                offset,
            }) => (scan_cursor, offset),
            Some(CacheBackendCursor::Local { .. }) => {
                return Err(DomainError::conflict("cache key list cursor is invalid"));
            }
            None => (0, 0),
        };
        let mut connection = self.connection().await?;
        self.with_timeout(
            async move {
                let mut cursor = scan_cursor;
                let mut offset = offset;
                let mut keys = Vec::new();
                let mut scanned_items = 0_usize;
                let return_limit = page_size.unwrap_or(usize::MAX);
                let bounded = page_size.is_some();

                loop {
                    let batch_cursor = cursor;
                    let batch_offset = offset;
                    let (next_cursor, mut batch): (u64, Vec<String>) = redis::cmd("SCAN")
                        .cursor_arg(cursor)
                        .arg("MATCH")
                        .arg(pattern.as_str())
                        .arg("COUNT")
                        .arg(500_u32)
                        .query_async(&mut connection)
                        .await?;
                    batch.sort();
                    let mut matched_index = 0_usize;
                    for key in batch {
                        if matched_index < batch_offset {
                            matched_index = matched_index.saturating_add(1);
                            continue;
                        }
                        if bounded && keys.len() >= return_limit {
                            scanned_items = scanned_items.saturating_add(1);
                            return Ok(RedisScanKeyPage {
                                scanned_items,
                                scan_complete: false,
                                next_cursor: Some(CacheBackendCursor::Redis {
                                    scan_cursor: batch_cursor,
                                    offset: matched_index,
                                }),
                                keys,
                            });
                        }
                        keys.push(key);
                        scanned_items = scanned_items.saturating_add(1);
                        matched_index = matched_index.saturating_add(1);
                    }
                    if next_cursor == 0 {
                        return Ok(RedisScanKeyPage {
                            scanned_items,
                            scan_complete: true,
                            next_cursor: None,
                            keys,
                        });
                    }
                    cursor = next_cursor;
                    offset = 0;
                }
            },
            "redis cache scan",
        )
        .await
    }
}

#[derive(Debug)]
struct RedisScanKeyPage {
    scanned_items: usize,
    scan_complete: bool,
    next_cursor: Option<CacheBackendCursor>,
    keys: Vec<String>,
}

#[derive(Debug, Default)]
struct CacheRuntimeMetrics {
    instances: RwLock<BTreeMap<String, Arc<CacheInstanceMetrics>>>,
    system_errors: AtomicU64,
}

impl CacheRuntimeMetrics {
    async fn instance(&self, instance_name: &str) -> Arc<CacheInstanceMetrics> {
        if let Some(metrics) = self.instances.read().await.get(instance_name).cloned() {
            return metrics;
        }
        let mut instances = self.instances.write().await;
        instances
            .entry(instance_name.to_owned())
            .or_insert_with(|| Arc::new(CacheInstanceMetrics::default()))
            .clone()
    }

    fn record_system_error(&self) {
        self.system_errors.fetch_add(1, Ordering::Relaxed);
    }

    fn system_errors(&self) -> u64 {
        self.system_errors.load(Ordering::Relaxed)
    }
}

#[derive(Debug, Default)]
struct CacheInstanceMetrics {
    hits: AtomicU64,
    misses: AtomicU64,
    writes: AtomicU64,
    deletes: AtomicU64,
    refreshes: AtomicU64,
    inspections: AtomicU64,
    errors: AtomicU64,
}

impl CacheInstanceMetrics {
    fn record_hit(&self) {
        self.hits.fetch_add(1, Ordering::Relaxed);
    }

    fn record_miss(&self) {
        self.misses.fetch_add(1, Ordering::Relaxed);
    }

    fn record_write(&self) {
        self.writes.fetch_add(1, Ordering::Relaxed);
    }

    fn record_delete(&self) {
        self.deletes.fetch_add(1, Ordering::Relaxed);
    }

    fn record_refresh(&self) {
        self.refreshes.fetch_add(1, Ordering::Relaxed);
    }

    fn record_inspection(&self) {
        self.inspections.fetch_add(1, Ordering::Relaxed);
    }

    fn record_error(&self) {
        self.errors.fetch_add(1, Ordering::Relaxed);
    }

    fn snapshot(&self) -> CacheMetricsSnapshot {
        CacheMetricsSnapshot {
            hits: self.hits.load(Ordering::Relaxed),
            misses: self.misses.load(Ordering::Relaxed),
            writes: self.writes.load(Ordering::Relaxed),
            deletes: self.deletes.load(Ordering::Relaxed),
            refreshes: self.refreshes.load(Ordering::Relaxed),
            inspections: self.inspections.load(Ordering::Relaxed),
            errors: self.errors.load(Ordering::Relaxed),
        }
    }
}

#[derive(Debug, Default, Clone, Copy)]
struct CacheMetricsSnapshot {
    hits: u64,
    misses: u64,
    writes: u64,
    deletes: u64,
    refreshes: u64,
    inspections: u64,
    errors: u64,
}

fn add_cache_metrics(total: &mut CacheMetricsSnapshot, metrics: CacheMetricsSnapshot) {
    total.hits += metrics.hits;
    total.misses += metrics.misses;
    total.writes += metrics.writes;
    total.deletes += metrics.deletes;
    total.refreshes += metrics.refreshes;
    total.inspections += metrics.inspections;
    total.errors += metrics.errors;
}

#[derive(Clone)]
pub struct RuntimeCacheManager {
    runtime: Arc<CacheRuntime>,
    backends: Arc<BTreeMap<String, Arc<dyn CacheBackend>>>,
    cursor_secret: Arc<[u8; 32]>,
    key_list_cursor_ttl: Duration,
    metrics: Arc<CacheRuntimeMetrics>,
}

impl RuntimeCacheManager {
    pub fn new(runtime: CacheRuntime) -> Self {
        let mut backends: BTreeMap<String, Arc<dyn CacheBackend>> = BTreeMap::new();
        for instance in &runtime.instances {
            if instance.provider_kind == CacheProviderKind::LocalCache {
                backends.insert(
                    instance.name.clone(),
                    Arc::new(LocalCacheBackend::with_max_entries(instance.max_entries)),
                );
            }
        }
        Self {
            runtime: Arc::new(runtime),
            backends: Arc::new(backends),
            cursor_secret: Arc::new(generate_cache_cursor_secret()),
            key_list_cursor_ttl: DEFAULT_CACHE_KEY_LIST_CURSOR_TTL,
            metrics: Arc::new(CacheRuntimeMetrics::default()),
        }
    }

    pub fn with_backend(
        mut self,
        instance_name: impl Into<String>,
        backend: Arc<dyn CacheBackend>,
    ) -> Self {
        let mut backends = (*self.backends).clone();
        backends.insert(instance_name.into(), backend);
        self.backends = Arc::new(backends);
        self
    }

    pub fn with_key_list_cursor_ttl(mut self, ttl: Duration) -> Self {
        self.key_list_cursor_ttl = ttl.max(Duration::from_millis(1));
        self
    }

    pub async fn validate(&self) -> DomainResult<()> {
        let mut seen_instances = BTreeMap::new();
        for instance in &self.runtime.instances {
            if instance.name.trim().is_empty() {
                return Err(DomainError::new("cache instance name is required"));
            }
            if instance.key_prefix.trim().is_empty() {
                return Err(DomainError::new(format!(
                    "cache instance {} key prefix is required",
                    instance.name
                )));
            }
            if instance.key_prefix != instance.key_prefix.trim() {
                return Err(DomainError::new(format!(
                    "cache instance {} key prefix must not contain leading or trailing whitespace",
                    instance.name
                )));
            }
            if instance.key_prefix.starts_with(':') || instance.key_prefix.ends_with(':') {
                return Err(DomainError::new(format!(
                    "cache instance {} key prefix must not start or end with ':'",
                    instance.name
                )));
            }
            if instance.default_ttl_seconds == 0 {
                return Err(DomainError::new(format!(
                    "cache instance {} default ttl must be positive",
                    instance.name
                )));
            }
            if instance.provider_kind == CacheProviderKind::LocalCache {
                if matches!(instance.max_entries, Some(0)) {
                    return Err(DomainError::new(format!(
                        "cache instance {} local max entries must be positive",
                        instance.name
                    )));
                }
                if instance.connection_profile_name.is_some() {
                    return Err(DomainError::new(format!(
                        "cache instance {} local cache must not define redis connection profile",
                        instance.name
                    )));
                }
            }
            if instance.provider_kind == CacheProviderKind::RedisCache
                && instance
                    .connection_profile_name
                    .as_deref()
                    .map(str::trim)
                    .unwrap_or_default()
                    .is_empty()
            {
                return Err(DomainError::new(format!(
                    "cache instance {} redis connection profile is required",
                    instance.name
                )));
            }
            if self.runtime.runtime_target == CacheRuntimeTarget::DesktopPackaged
                && instance.provider_kind != CacheProviderKind::LocalCache
            {
                return Err(DomainError::new(format!(
                    "desktop packaged runtime requires local cache instances, but {} uses {}",
                    instance.name,
                    instance.provider_kind.as_str()
                )));
            }
            if self.runtime.runtime_target == CacheRuntimeTarget::Service
                && instance.provider_kind != CacheProviderKind::RedisCache
            {
                return Err(DomainError::new(format!(
                    "service runtime requires redis cache instances, but {} uses {}",
                    instance.name,
                    instance.provider_kind.as_str()
                )));
            }
            if seen_instances.insert(instance.name.as_str(), ()).is_some() {
                return Err(DomainError::new(format!(
                    "duplicate cache instance: {}",
                    instance.name
                )));
            }
            if !self.backends.contains_key(&instance.name) {
                return Err(DomainError::new(format!(
                    "cache instance {} has no backend",
                    instance.name
                )));
            }
        }
        let mut key_prefixes: Vec<(&str, &str)> = self
            .runtime
            .instances
            .iter()
            .map(|instance| (instance.name.as_str(), instance.key_prefix.as_str()))
            .collect();
        key_prefixes.sort_by(|left, right| left.1.cmp(right.1));
        for window in key_prefixes.windows(2) {
            let (left_name, left_prefix) = window[0];
            let (right_name, right_prefix) = window[1];
            if left_prefix == right_prefix
                || right_prefix.starts_with(&format!("{left_prefix}:"))
                || left_prefix.starts_with(&format!("{right_prefix}:"))
            {
                return Err(DomainError::new(format!(
                    "cache instance key prefixes must not overlap: {left_name}={left_prefix}, {right_name}={right_prefix}"
                )));
            }
        }
        let mut seen_namespaces = BTreeMap::new();
        for policy in &self.runtime.namespace_policies {
            if policy.namespace.trim().is_empty() {
                return Err(DomainError::new("cache namespace is required"));
            }
            if seen_namespaces
                .insert(policy.namespace.as_str(), ())
                .is_some()
            {
                return Err(DomainError::new(format!(
                    "duplicate cache namespace: {}",
                    policy.namespace
                )));
            }
            if policy.ttl_seconds == 0 {
                return Err(DomainError::new(format!(
                    "cache namespace {} ttl must be positive",
                    policy.namespace
                )));
            }
            if !CACHE_SCOPES.contains(&policy.scope.as_str()) {
                return Err(DomainError::new(format!(
                    "cache namespace {} scope is unsupported: {}",
                    policy.namespace, policy.scope
                )));
            }
            if !CACHE_SENSITIVITIES.contains(&policy.sensitivity.as_str()) {
                return Err(DomainError::new(format!(
                    "cache namespace {} sensitivity is unsupported: {}",
                    policy.namespace, policy.sensitivity
                )));
            }
            if !CACHE_FAILURE_MODES.contains(&policy.failure_mode.as_str()) {
                return Err(DomainError::new(format!(
                    "cache namespace {} failure mode is unsupported: {}",
                    policy.namespace, policy.failure_mode
                )));
            }
            if !CACHE_CONSISTENCY_LEVELS.contains(&policy.consistency.as_str()) {
                return Err(DomainError::new(format!(
                    "cache namespace {} consistency is unsupported: {}",
                    policy.namespace, policy.consistency
                )));
            }
            if policy.jitter_percent > 100 {
                return Err(DomainError::new(format!(
                    "cache namespace {} jitter percent must be between 0 and 100",
                    policy.namespace
                )));
            }
            if !self
                .runtime
                .instances
                .iter()
                .any(|instance| instance.name == policy.instance_name)
            {
                return Err(DomainError::new(format!(
                    "cache namespace {} references unknown instance {}",
                    policy.namespace, policy.instance_name
                )));
            }
        }
        Ok(())
    }

    pub async fn snapshot(&self) -> DomainResult<CacheRuntimeSnapshot> {
        self.validate().await?;
        let mut instances = Vec::new();
        let mut total_entries = 0_usize;
        let mut expired_entries = 0_usize;
        let mut total_metrics = CacheMetricsSnapshot {
            errors: self.metrics.system_errors(),
            ..CacheMetricsSnapshot::default()
        };
        for instance in &self.runtime.instances {
            let instance_metrics = self.metrics.instance(&instance.name).await;
            let stats = match self.instance_prefix(instance) {
                Ok(prefix) => match self.backend(&instance.name) {
                    Ok(backend) => match backend.stats_prefix(prefix).await {
                        Ok(stats) => Some(stats),
                        Err(_) => {
                            instance_metrics.record_error();
                            None
                        }
                    },
                    Err(_) => {
                        instance_metrics.record_error();
                        None
                    }
                },
                Err(_) => {
                    instance_metrics.record_error();
                    None
                }
            };
            let metrics = instance_metrics.snapshot();
            let status = if stats.is_some() { "ready" } else { "degraded" };
            let entry_count = stats.as_ref().map_or(0, |stats| stats.entry_count);
            let expired_entry_count = stats.as_ref().map_or(0, |stats| stats.expired_entry_count);
            total_entries += entry_count;
            expired_entries += expired_entry_count;
            add_cache_metrics(&mut total_metrics, metrics);
            instances.push(CacheInstanceSnapshot {
                name: instance.name.clone(),
                provider_kind: instance.provider_kind,
                purpose: instance.purpose.clone(),
                key_prefix: instance.key_prefix.clone(),
                default_ttl_seconds: instance.default_ttl_seconds,
                max_entries: instance.max_entries,
                connection_profile_name: instance.connection_profile_name.clone(),
                supports_inspect: instance.supports_inspect,
                supports_refresh: instance.supports_refresh,
                supports_delete: instance.supports_delete,
                entry_count,
                expired_entry_count,
                cache_hits: metrics.hits,
                cache_misses: metrics.misses,
                cache_writes: metrics.writes,
                cache_deletes: metrics.deletes,
                cache_refreshes: metrics.refreshes,
                cache_inspections: metrics.inspections,
                cache_errors: metrics.errors,
                status: status.to_owned(),
            });
        }
        Ok(CacheRuntimeSnapshot {
            summary: CacheRuntimeSummary {
                runtime_target: self.runtime.runtime_target,
                total_instances: instances.len(),
                total_namespaces: self.runtime.namespace_policies.len(),
                total_entries,
                expired_entries,
                cache_hits: total_metrics.hits,
                cache_misses: total_metrics.misses,
                cache_writes: total_metrics.writes,
                cache_deletes: total_metrics.deletes,
                cache_refreshes: total_metrics.refreshes,
                cache_inspections: total_metrics.inspections,
                cache_errors: total_metrics.errors,
            },
            instances,
            namespace_policies: self.runtime.namespace_policies.clone(),
        })
    }

    pub async fn get_json(&self, namespace: &str, key: &str) -> DomainResult<Option<Value>> {
        let (instance, policy) = match self.resolve_namespace(namespace) {
            Ok(resolved) => resolved,
            Err(error) => {
                self.metrics.record_system_error();
                return Err(error);
            }
        };
        if !policy.enabled {
            return Ok(None);
        }
        let metrics = self.metrics.instance(&instance.name).await;
        let backend = match self.backend(&instance.name) {
            Ok(backend) => backend,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let full_key = match self.full_key(instance, namespace, key) {
            Ok(full_key) => full_key,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let result = backend.get_json(&full_key).await;
        match &result {
            Ok(Some(_)) => metrics.record_hit(),
            Ok(None) => metrics.record_miss(),
            Err(_) => metrics.record_error(),
        }
        result
    }

    pub async fn set_json(&self, namespace: &str, key: &str, value: Value) -> DomainResult<()> {
        let (instance, policy) = match self.resolve_namespace(namespace) {
            Ok(resolved) => resolved,
            Err(error) => {
                self.metrics.record_system_error();
                return Err(error);
            }
        };
        if !policy.enabled {
            return Ok(());
        }
        let metrics = self.metrics.instance(&instance.name).await;
        let ttl = match policy_ttl_duration(policy, key) {
            Ok(ttl) => ttl,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let backend = match self.backend(&instance.name) {
            Ok(backend) => backend,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let full_key = match self.full_key(instance, namespace, key) {
            Ok(full_key) => full_key,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let result = backend.set_json(full_key, value, ttl).await;
        match &result {
            Ok(()) => metrics.record_write(),
            Err(_) => metrics.record_error(),
        }
        result
    }

    pub async fn delete_key(
        &self,
        namespace: &str,
        key: &str,
    ) -> DomainResult<CacheOperationOutcome> {
        let (instance, _) = match self.resolve_namespace(namespace) {
            Ok(resolved) => resolved,
            Err(error) => {
                self.metrics.record_system_error();
                return Err(error);
            }
        };
        let metrics = self.metrics.instance(&instance.name).await;
        if !instance.supports_delete {
            metrics.record_error();
            return Err(DomainError::conflict(format!(
                "cache instance {} does not support delete",
                instance.name
            )));
        }
        let backend = match self.backend(&instance.name) {
            Ok(backend) => backend,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let full_key = match self.full_key(instance, namespace, key) {
            Ok(full_key) => full_key,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let result = backend.delete(&full_key).await;
        let deleted = match result {
            Ok(deleted) => {
                metrics.record_delete();
                deleted
            }
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        Ok(CacheOperationOutcome {
            operation: "delete".to_owned(),
            instance_name: Some(instance.name.clone()),
            namespace: Some(namespace.to_owned()),
            cache_key: Some(key.to_owned()),
            deleted_entries: usize::from(deleted),
            refreshed_entries: 0,
            status: "completed".to_owned(),
        })
    }

    pub async fn delete_namespace(&self, namespace: &str) -> DomainResult<CacheOperationOutcome> {
        let (instance, _) = match self.resolve_namespace(namespace) {
            Ok(resolved) => resolved,
            Err(error) => {
                self.metrics.record_system_error();
                return Err(error);
            }
        };
        let metrics = self.metrics.instance(&instance.name).await;
        if !instance.supports_delete {
            metrics.record_error();
            return Err(DomainError::conflict(format!(
                "cache instance {} does not support delete",
                instance.name
            )));
        }
        let backend = match self.backend(&instance.name) {
            Ok(backend) => backend,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let namespace_prefix = match self.namespace_prefix(instance, namespace) {
            Ok(namespace_prefix) => namespace_prefix,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let result = backend.delete_prefix(namespace_prefix).await;
        let deleted = match result {
            Ok(deleted) => {
                metrics.record_delete();
                deleted
            }
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        Ok(CacheOperationOutcome {
            operation: "delete_namespace".to_owned(),
            instance_name: Some(instance.name.clone()),
            namespace: Some(namespace.to_owned()),
            cache_key: None,
            deleted_entries: deleted,
            refreshed_entries: 0,
            status: "completed".to_owned(),
        })
    }

    pub async fn delete_instance(
        &self,
        instance_name: &str,
    ) -> DomainResult<CacheOperationOutcome> {
        let instance = match self.instance(instance_name) {
            Ok(instance) => instance,
            Err(error) => {
                self.metrics.record_system_error();
                return Err(error);
            }
        };
        let metrics = self.metrics.instance(&instance.name).await;
        if !instance.supports_delete {
            metrics.record_error();
            return Err(DomainError::conflict(format!(
                "cache instance {} does not support delete",
                instance.name
            )));
        }
        let backend = match self.backend(instance_name) {
            Ok(backend) => backend,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let instance_prefix = match self.instance_prefix(instance) {
            Ok(instance_prefix) => instance_prefix,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let result = backend.delete_prefix(instance_prefix).await;
        let deleted = match result {
            Ok(deleted) => {
                metrics.record_delete();
                deleted
            }
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        Ok(CacheOperationOutcome {
            operation: "delete_instance".to_owned(),
            instance_name: Some(instance.name.clone()),
            namespace: None,
            cache_key: None,
            deleted_entries: deleted,
            refreshed_entries: 0,
            status: "completed".to_owned(),
        })
    }

    pub async fn refresh_namespace(&self, namespace: &str) -> DomainResult<CacheOperationOutcome> {
        let (instance, policy) = match self.resolve_namespace(namespace) {
            Ok(resolved) => resolved,
            Err(error) => {
                self.metrics.record_system_error();
                return Err(error);
            }
        };
        let metrics = self.metrics.instance(&instance.name).await;
        if !instance.supports_refresh {
            metrics.record_error();
            return Err(DomainError::conflict(format!(
                "cache instance {} does not support refresh",
                instance.name
            )));
        }
        if !policy.enabled {
            metrics.record_refresh();
            return Ok(CacheOperationOutcome {
                operation: "refresh_namespace".to_owned(),
                instance_name: Some(instance.name.clone()),
                namespace: Some(namespace.to_owned()),
                cache_key: None,
                deleted_entries: 0,
                refreshed_entries: 0,
                status: "completed".to_owned(),
            });
        }
        let backend = match self.backend(&instance.name) {
            Ok(backend) => backend,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let namespace_prefix = match self.namespace_prefix(instance, namespace) {
            Ok(namespace_prefix) => namespace_prefix,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let outcome_result = backend.refresh_prefix(namespace_prefix).await;
        let mut outcome = match outcome_result {
            Ok(outcome) => {
                metrics.record_refresh();
                outcome
            }
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        outcome.instance_name = Some(instance.name.clone());
        outcome.namespace = Some(namespace.to_owned());
        outcome.operation = "refresh_namespace".to_owned();
        Ok(outcome)
    }

    pub async fn list_namespace_keys(
        &self,
        namespace: &str,
        page_size: Option<usize>,
        cursor: Option<&str>,
    ) -> DomainResult<CacheNamespaceKeyList> {
        let limit = Some(page_size.unwrap_or(DEFAULT_CACHE_KEY_LIST_LIMIT));
        let (instance, policy) = match self.resolve_namespace(namespace) {
            Ok(resolved) => resolved,
            Err(error) => {
                self.metrics.record_system_error();
                return Err(error);
            }
        };
        let metrics = self.metrics.instance(&instance.name).await;
        if !instance.supports_inspect {
            metrics.record_error();
            return Err(DomainError::conflict(format!(
                "cache instance {} does not support inspect",
                instance.name
            )));
        }
        if !policy.enabled {
            return Ok(CacheNamespaceKeyList {
                namespace: namespace.to_owned(),
                instance_name: instance.name.clone(),
                scanned_items: 0,
                returned_items: 0,
                page_size: limit,
                has_more: false,
                scan_complete: true,
                next_cursor: None,
                items: Vec::new(),
            });
        }
        let decoded_cursor = match cursor
            .map(|value| self.decode_key_list_cursor(instance, namespace, value))
            .transpose()
        {
            Ok(cursor) => cursor,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let backend = match self.backend(&instance.name) {
            Ok(backend) => backend,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let namespace_prefix = match self.namespace_prefix(instance, namespace) {
            Ok(namespace_prefix) => namespace_prefix,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let backend_result = backend
            .list_prefix(namespace_prefix, limit, decoded_cursor)
            .await;
        let backend_list = match backend_result {
            Ok(list) => {
                metrics.record_inspection();
                list
            }
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let items: Vec<CacheKeyMetadata> = backend_list
            .items
            .into_iter()
            .map(|item| CacheKeyMetadata {
                key: item.key,
                namespace: namespace.to_owned(),
                instance_name: instance.name.clone(),
                status: item.status,
                expires_in_seconds: item.expires_in_seconds,
            })
            .collect();
        let returned_items = items.len();
        let next_cursor = match backend_list
            .next_cursor
            .map(|cursor| self.encode_key_list_cursor(instance, namespace, cursor))
            .transpose()
        {
            Ok(cursor) => cursor,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        Ok(CacheNamespaceKeyList {
            namespace: namespace.to_owned(),
            instance_name: instance.name.clone(),
            scanned_items: backend_list.scanned_items,
            returned_items,
            page_size: limit,
            has_more: next_cursor.is_some()
                || returned_items < backend_list.scanned_items
                || !backend_list.scan_complete,
            scan_complete: backend_list.scan_complete,
            next_cursor,
            items,
        })
    }

    pub async fn refresh_instance(
        &self,
        instance_name: &str,
    ) -> DomainResult<CacheOperationOutcome> {
        let instance = match self.instance(instance_name) {
            Ok(instance) => instance,
            Err(error) => {
                self.metrics.record_system_error();
                return Err(error);
            }
        };
        let metrics = self.metrics.instance(&instance.name).await;
        if !instance.supports_refresh {
            metrics.record_error();
            return Err(DomainError::conflict(format!(
                "cache instance {} does not support refresh",
                instance.name
            )));
        }
        let backend = match self.backend(instance_name) {
            Ok(backend) => backend,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let instance_prefix = match self.instance_prefix(instance) {
            Ok(instance_prefix) => instance_prefix,
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        let outcome_result = backend.refresh_prefix(instance_prefix).await;
        let mut outcome = match outcome_result {
            Ok(outcome) => {
                metrics.record_refresh();
                outcome
            }
            Err(error) => {
                metrics.record_error();
                return Err(error);
            }
        };
        outcome.instance_name = Some(instance.name.clone());
        outcome.operation = "refresh".to_owned();
        Ok(outcome)
    }

    pub async fn refresh_all(&self) -> DomainResult<CacheOperationOutcome> {
        let mut deleted_entries = 0_usize;
        let mut refreshed_entries = 0_usize;
        for instance in &self.runtime.instances {
            let outcome = self.refresh_instance(&instance.name).await?;
            deleted_entries += outcome.deleted_entries;
            refreshed_entries += outcome.refreshed_entries;
        }
        Ok(CacheOperationOutcome {
            operation: "refresh_all".to_owned(),
            instance_name: None,
            namespace: None,
            cache_key: None,
            deleted_entries,
            refreshed_entries,
            status: "completed".to_owned(),
        })
    }

    fn backend(&self, instance_name: &str) -> DomainResult<&Arc<dyn CacheBackend>> {
        self.backends.get(instance_name).ok_or_else(|| {
            DomainError::new(format!(
                "cache backend for instance {instance_name} is not configured"
            ))
        })
    }

    fn instance(&self, instance_name: &str) -> DomainResult<&CacheInstanceSpec> {
        self.runtime
            .instances
            .iter()
            .find(|instance| instance.name == instance_name)
            .ok_or_else(|| {
                DomainError::not_found(format!("unknown cache instance: {instance_name}"))
            })
    }

    fn resolve_namespace(
        &self,
        namespace: &str,
    ) -> DomainResult<(&CacheInstanceSpec, &CacheNamespacePolicy)> {
        let policy = self
            .runtime
            .namespace_policies
            .iter()
            .find(|policy| policy.namespace == namespace)
            .ok_or_else(|| {
                DomainError::not_found(format!("unknown cache namespace: {namespace}"))
            })?;
        Ok((self.instance(&policy.instance_name)?, policy))
    }

    fn full_key(
        &self,
        instance: &CacheInstanceSpec,
        namespace: &str,
        key: &str,
    ) -> DomainResult<String> {
        let key = key.trim();
        if key.is_empty() {
            return Err(DomainError::new(format!(
                "cache key for namespace {namespace} is required"
            )));
        }
        Ok(format!("{}:{}:{}", instance.key_prefix, namespace, key))
    }

    fn namespace_prefix(
        &self,
        instance: &CacheInstanceSpec,
        namespace: &str,
    ) -> DomainResult<String> {
        if namespace.trim().is_empty() {
            return Err(DomainError::new("cache namespace is required"));
        }
        Ok(format!("{}:{}:", instance.key_prefix, namespace))
    }

    fn instance_prefix(&self, instance: &CacheInstanceSpec) -> DomainResult<String> {
        let key_prefix = instance.key_prefix.trim();
        if key_prefix.is_empty() {
            return Err(DomainError::new(format!(
                "cache instance {} key prefix is required",
                instance.name
            )));
        }
        Ok(format!("{key_prefix}:"))
    }

    fn encode_key_list_cursor(
        &self,
        instance: &CacheInstanceSpec,
        namespace: &str,
        cursor: CacheBackendCursor,
    ) -> DomainResult<String> {
        let payload = CacheKeyListCursorPayload {
            version: CACHE_KEY_LIST_CURSOR_VERSION,
            scope_hash: self.key_list_cursor_scope_hash(instance, namespace)?,
            issued_at_unix_ms: unix_now_millis(),
            cursor,
        };
        let payload_bytes = serde_json::to_vec(&payload).map_err(|error| {
            DomainError::new(format!("cache key list cursor encode failed: {error}"))
        })?;
        let mut mac = HmacSha256::new_from_slice(self.cursor_secret.as_ref())
            .expect("HMAC accepts cache cursor secrets of any length");
        mac.update(&payload_bytes);
        Ok(format!(
            "v1.{}.{}",
            hex::encode(&payload_bytes),
            hex::encode(mac.finalize().into_bytes())
        ))
    }

    fn decode_key_list_cursor(
        &self,
        instance: &CacheInstanceSpec,
        namespace: &str,
        cursor: &str,
    ) -> DomainResult<CacheBackendCursor> {
        let mut parts = cursor.split('.');
        let version = parts.next();
        let payload_hex = parts.next();
        let signature_hex = parts.next();
        if version != Some("v1")
            || payload_hex.is_none()
            || signature_hex.is_none()
            || parts.next().is_some()
        {
            return Err(DomainError::conflict("cache key list cursor is invalid"));
        }
        let payload_bytes = hex::decode(payload_hex.unwrap())
            .map_err(|_| DomainError::conflict("cache key list cursor is invalid"))?;
        let signature = hex::decode(signature_hex.unwrap())
            .map_err(|_| DomainError::conflict("cache key list cursor is invalid"))?;
        let mut mac = HmacSha256::new_from_slice(self.cursor_secret.as_ref())
            .expect("HMAC accepts cache cursor secrets of any length");
        mac.update(&payload_bytes);
        mac.verify_slice(&signature)
            .map_err(|_| DomainError::conflict("cache key list cursor is invalid"))?;
        let payload: CacheKeyListCursorPayload = serde_json::from_slice(&payload_bytes)
            .map_err(|_| DomainError::conflict("cache key list cursor is invalid"))?;
        if payload.version != CACHE_KEY_LIST_CURSOR_VERSION
            || payload.scope_hash != self.key_list_cursor_scope_hash(instance, namespace)?
        {
            return Err(DomainError::conflict("cache key list cursor is invalid"));
        }
        let now = unix_now_millis();
        let ttl_ms = self.key_list_cursor_ttl.as_millis().max(1);
        if payload.issued_at_unix_ms > now || now.saturating_sub(payload.issued_at_unix_ms) > ttl_ms
        {
            return Err(DomainError::conflict("cache key list cursor expired"));
        }
        match (&instance.provider_kind, &payload.cursor) {
            (CacheProviderKind::LocalCache, CacheBackendCursor::Local { .. })
            | (CacheProviderKind::RedisCache, CacheBackendCursor::Redis { .. }) => {
                Ok(payload.cursor)
            }
            _ => Err(DomainError::conflict("cache key list cursor is invalid")),
        }
    }

    fn key_list_cursor_scope_hash(
        &self,
        instance: &CacheInstanceSpec,
        namespace: &str,
    ) -> DomainResult<String> {
        let mut hasher = Sha256::new();
        hasher.update(instance.name.as_bytes());
        hasher.update([0]);
        hasher.update(instance.provider_kind.as_str().as_bytes());
        hasher.update([0]);
        hasher.update(namespace.as_bytes());
        hasher.update([0]);
        hasher.update(self.namespace_prefix(instance, namespace)?.as_bytes());
        let digest = hasher.finalize();
        Ok(hex::encode(&digest[..16]))
    }
}

fn policy_ttl_duration(policy: &CacheNamespacePolicy, key: &str) -> DomainResult<Duration> {
    let ttl_seconds = policy
        .ttl_seconds
        .checked_add(ttl_jitter_seconds(policy, key)?)
        .ok_or_else(|| {
            DomainError::new(format!(
                "cache namespace {} ttl overflowed",
                policy.namespace
            ))
        })?;
    Ok(Duration::from_secs(ttl_seconds.max(1)))
}

fn ttl_jitter_seconds(policy: &CacheNamespacePolicy, key: &str) -> DomainResult<u64> {
    if policy.jitter_percent == 0 {
        return Ok(0);
    }
    let jitter_max = policy
        .ttl_seconds
        .checked_mul(u64::from(policy.jitter_percent))
        .ok_or_else(|| {
            DomainError::new(format!(
                "cache namespace {} ttl jitter overflowed",
                policy.namespace
            ))
        })?
        / 100;
    if jitter_max == 0 {
        return Ok(0);
    }
    let mut hasher = DefaultHasher::new();
    policy.namespace.hash(&mut hasher);
    key.hash(&mut hasher);
    Ok(1 + hasher.finish() % jitter_max)
}

fn generate_cache_cursor_secret() -> [u8; 32] {
    let mut secret = [0_u8; 32];
    if getrandom::fill(&mut secret).is_ok() {
        return secret;
    }
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let fallback = Sha256::digest(format!("cache-cursor:{timestamp}").as_bytes());
    secret.copy_from_slice(&fallback[..32]);
    secret
}

fn unix_now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

pub fn default_desktop_cache_runtime() -> CacheRuntime {
    CacheRuntime {
        runtime_target: CacheRuntimeTarget::DesktopPackaged,
        instances: vec![CacheInstanceSpec::local(
            DEFAULT_DESKTOP_CACHE_INSTANCE_NAME,
            "Desktop packaged local cache",
            DEFAULT_CACHE_KEY_PREFIX,
            300,
            Some(100_000),
        )],
        namespace_policies: default_cache_namespace_policies(DEFAULT_DESKTOP_CACHE_INSTANCE_NAME),
    }
}

pub fn default_desktop_cache_manager() -> RuntimeCacheManager {
    RuntimeCacheManager::new(default_desktop_cache_runtime())
}

pub fn default_service_cache_runtime(
    connection_profile_name: impl Into<String>,
    key_prefix: impl Into<String>,
) -> CacheRuntime {
    CacheRuntime {
        runtime_target: CacheRuntimeTarget::Service,
        instances: vec![CacheInstanceSpec::redis(
            DEFAULT_SERVICE_CACHE_INSTANCE_NAME,
            "Service distributed Redis cache",
            key_prefix,
            300,
            connection_profile_name,
        )],
        namespace_policies: default_cache_namespace_policies(DEFAULT_SERVICE_CACHE_INSTANCE_NAME),
    }
}

pub fn default_service_cache_manager(
    connection_profile_name: impl Into<String>,
    key_prefix: impl Into<String>,
) -> RuntimeCacheManager {
    RuntimeCacheManager::new(default_service_cache_runtime(
        connection_profile_name,
        key_prefix,
    ))
}

fn default_cache_namespace_policies(instance_name: &str) -> Vec<CacheNamespacePolicy> {
    let mut auth_qr = CacheNamespacePolicy::new(
        AUTH_QR_CACHE_NAMESPACE,
        instance_name,
        300,
        "session",
        "sensitive",
        vec!["auth".to_owned(), "qr".to_owned(), "login".to_owned()],
    );
    auth_qr.failure_mode = "fail_closed".to_owned();
    auth_qr.consistency = "coordination_critical".to_owned();

    let mut route_snapshot = CacheNamespacePolicy::new(
        ROUTING_SNAPSHOT_CACHE_NAMESPACE,
        instance_name,
        86_400,
        "tenant",
        "internal",
        vec!["routing".to_owned(), "snapshot".to_owned(), "ai".to_owned()],
    );
    route_snapshot.failure_mode = "serve_stale".to_owned();
    route_snapshot.consistency = "bounded_stale".to_owned();
    route_snapshot.stale_while_revalidate_seconds = 300;
    route_snapshot.jitter_percent = 5;

    let mut provider_object_route = CacheNamespacePolicy::new(
        ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
        instance_name,
        3_600,
        "tenant",
        "private",
        vec!["routing".to_owned(), "sticky".to_owned(), "ai".to_owned()],
    );
    provider_object_route.failure_mode = "origin_fallback".to_owned();
    provider_object_route.consistency = "coordination_critical".to_owned();
    provider_object_route.jitter_percent = 5;

    let mut idempotency = CacheNamespacePolicy::new(
        ROUTING_IDEMPOTENCY_CACHE_NAMESPACE,
        instance_name,
        86_400,
        "tenant",
        "private",
        vec![
            "routing".to_owned(),
            "idempotency".to_owned(),
            "ai".to_owned(),
        ],
    );
    idempotency.failure_mode = "origin_fallback".to_owned();
    idempotency.consistency = "coordination_critical".to_owned();
    idempotency.jitter_percent = 2;

    let mut config_version = CacheNamespacePolicy::new(
        ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
        instance_name,
        300,
        "global",
        "internal",
        vec!["routing".to_owned(), "config".to_owned(), "ai".to_owned()],
    );
    config_version.failure_mode = "origin_fallback".to_owned();
    config_version.consistency = "coordination_critical".to_owned();
    config_version.jitter_percent = 0;

    let mut disabled_channel = CacheNamespacePolicy::new(
        ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE,
        instance_name,
        300,
        "tenant",
        "internal",
        vec!["routing".to_owned(), "health".to_owned(), "ai".to_owned()],
    );
    disabled_channel.failure_mode = "fail_closed".to_owned();
    disabled_channel.consistency = "coordination_critical".to_owned();
    disabled_channel.jitter_percent = 0;

    vec![
        auth_qr,
        route_snapshot,
        provider_object_route,
        idempotency,
        config_version,
        disabled_channel,
    ]
}
