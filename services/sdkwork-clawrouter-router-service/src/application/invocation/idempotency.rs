use std::collections::HashMap;
use std::fmt::{Display, Formatter};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use sdkwork_claw_config::RedisConfig;
use sdkwork_utils_rust::{sha256_hash, uuid};
use serde::{Deserialize, Serialize};

use super::{
    DispatchMode, Invocation, InvocationAuthType, InvocationBody, InvocationDispatchResponse,
    InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor, InvocationShape,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IdempotencyKeyStatus {
    Unknown,
    InProgress,
    Completed,
    Failed,
}

#[derive(Debug, Clone, PartialEq)]
pub struct IdempotencyStoreEntry {
    pub status: IdempotencyKeyStatus,
    pub request_fingerprint: String,
    pub response: Option<InvocationDispatchResponse>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IdempotencyLockAcquisition {
    Acquired,
    Contended,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IdempotencyStoreError;

impl Display for IdempotencyStoreError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("idempotency store is unavailable")
    }
}

impl std::error::Error for IdempotencyStoreError {}

#[derive(Debug, Clone)]
pub struct IdempotencyConfig {
    pub ttl: Duration,
    pub max_entries: usize,
    pub in_progress_timeout: Duration,
    pub cache_failures: bool,
    pub max_wait_retries: u32,
    pub wait_retry_delay: Duration,
}

impl Default for IdempotencyConfig {
    fn default() -> Self {
        Self {
            ttl: Duration::from_secs(86_400),
            max_entries: 10_000,
            in_progress_timeout: Duration::from_secs(120),
            cache_failures: false,
            max_wait_retries: 10,
            wait_retry_delay: Duration::from_millis(100),
        }
    }
}

/// Atomic idempotency lease and response store.
///
/// Implementations must condition completion and release on `owner_token`.
/// This prevents an expired request from overwriting or deleting a lease that
/// a newer request acquired for the same scoped key.
#[async_trait::async_trait]
pub trait IdempotencyStore: Send + Sync {
    async fn lookup(
        &self,
        storage_key: &str,
    ) -> Result<Option<IdempotencyStoreEntry>, IdempotencyStoreError>;

    async fn try_acquire_lock(
        &self,
        storage_key: &str,
        request_fingerprint: &str,
        owner_token: &str,
        ttl: Duration,
    ) -> Result<IdempotencyLockAcquisition, IdempotencyStoreError>;

    async fn complete_if_owner(
        &self,
        storage_key: &str,
        request_fingerprint: &str,
        owner_token: &str,
        response: &InvocationDispatchResponse,
        ttl: Duration,
    ) -> Result<bool, IdempotencyStoreError>;

    async fn release_if_owner(
        &self,
        storage_key: &str,
        owner_token: &str,
    ) -> Result<bool, IdempotencyStoreError>;

    fn is_distributed_ha(&self) -> bool;
}

#[derive(Clone)]
pub struct IdempotencyInterceptor {
    config: IdempotencyConfig,
    store: Arc<dyn IdempotencyStore>,
}

impl IdempotencyInterceptor {
    pub fn new(config: IdempotencyConfig) -> Self {
        Self {
            store: Arc::new(LocalIdempotencyStore::new(config.max_entries)),
            config,
        }
    }

    /// Builds a Redis-backed interceptor when Redis is configured. A runtime
    /// Redis failure is fail-closed; silently switching to a per-node lock can
    /// duplicate side effects in a multi-node deployment.
    pub fn try_with_redis_config(
        config: IdempotencyConfig,
        redis_config: Option<&RedisConfig>,
    ) -> Self {
        let Some(redis_config) = redis_config else {
            return Self::new(config);
        };
        Self::with_redis_endpoint(
            config,
            redis_config.url(),
            redis_config.key_prefix().unwrap_or("clawrouter"),
        )
    }

    fn with_redis_endpoint(config: IdempotencyConfig, url: &str, prefix: &str) -> Self {
        let store: Arc<dyn IdempotencyStore> = match RedisIdempotencyStore::try_new(url, prefix) {
            Ok(store) => Arc::new(store),
            Err(_) => {
                tracing::error!(
                    idempotency_store_unavailable = 1,
                    "idempotency Redis configuration is invalid; coordination is fail-closed"
                );
                Arc::new(UnavailableIdempotencyStore)
            }
        };
        Self { config, store }
    }

    pub fn uses_distributed_ha(&self) -> bool {
        self.store.is_distributed_ha()
    }

    fn active_store(&self) -> Arc<dyn IdempotencyStore> {
        self.store.clone()
    }

    async fn acquire_or_replay(
        &self,
        invocation: &mut Invocation,
        context: &IdempotencyRequestContext,
    ) -> Result<(), InvocationError> {
        let store = self.active_store();

        for _ in 0..2 {
            if let Some(entry) = store
                .lookup(&context.storage_key)
                .await
                .map_err(idempotency_store_error)?
            {
                match self
                    .resolve_existing_entry(invocation, context, entry, store.as_ref())
                    .await?
                {
                    ExistingEntryResolution::Replayed => return Ok(()),
                    ExistingEntryResolution::Released => continue,
                }
            }

            match store
                .try_acquire_lock(
                    &context.storage_key,
                    &context.request_fingerprint,
                    &context.owner_token,
                    self.config.in_progress_timeout,
                )
                .await
                .map_err(idempotency_store_error)?
            {
                IdempotencyLockAcquisition::Acquired => {
                    tracing::debug!(
                        idempotency_scope_hash = %context.storage_key,
                        "idempotency lease acquired"
                    );
                    return Ok(());
                }
                IdempotencyLockAcquisition::Contended => {
                    if let Some(response) = self
                        .wait_for_completion(
                            store.as_ref(),
                            &context.storage_key,
                            &context.request_fingerprint,
                        )
                        .await?
                    {
                        replay_response(invocation, response);
                        return Ok(());
                    }
                }
            }
        }

        Err(idempotency_locked_error())
    }

    async fn resolve_existing_entry(
        &self,
        invocation: &mut Invocation,
        context: &IdempotencyRequestContext,
        entry: IdempotencyStoreEntry,
        store: &dyn IdempotencyStore,
    ) -> Result<ExistingEntryResolution, InvocationError> {
        ensure_matching_fingerprint(&context.request_fingerprint, &entry.request_fingerprint)?;
        match entry.status {
            IdempotencyKeyStatus::Completed | IdempotencyKeyStatus::Failed => {
                let response = entry.response.ok_or_else(idempotency_store_error_value)?;
                replay_response(invocation, response);
                Ok(ExistingEntryResolution::Replayed)
            }
            IdempotencyKeyStatus::InProgress => {
                if let Some(response) = self
                    .wait_for_completion(store, &context.storage_key, &context.request_fingerprint)
                    .await?
                {
                    replay_response(invocation, response);
                    Ok(ExistingEntryResolution::Replayed)
                } else {
                    Ok(ExistingEntryResolution::Released)
                }
            }
            IdempotencyKeyStatus::Unknown => Ok(ExistingEntryResolution::Released),
        }
    }

    async fn wait_for_completion(
        &self,
        store: &dyn IdempotencyStore,
        storage_key: &str,
        request_fingerprint: &str,
    ) -> Result<Option<InvocationDispatchResponse>, InvocationError> {
        for _ in 0..self.config.max_wait_retries {
            tokio::time::sleep(self.config.wait_retry_delay).await;
            let Some(entry) = store
                .lookup(storage_key)
                .await
                .map_err(idempotency_store_error)?
            else {
                return Ok(None);
            };
            ensure_matching_fingerprint(request_fingerprint, &entry.request_fingerprint)?;
            match entry.status {
                IdempotencyKeyStatus::Completed | IdempotencyKeyStatus::Failed => {
                    return entry
                        .response
                        .map(Some)
                        .ok_or_else(idempotency_store_error_value);
                }
                IdempotencyKeyStatus::Unknown => return Ok(None),
                IdempotencyKeyStatus::InProgress => {}
            }
        }
        Err(idempotency_locked_error())
    }

    async fn release_owned_lease(&self, invocation: &mut Invocation) {
        let Some(context) = owned_idempotency_context(invocation) else {
            return;
        };
        let store = self.active_store();
        if store
            .release_if_owner(&context.storage_key, &context.owner_token)
            .await
            .is_err()
        {
            tracing::warn!(
                idempotency_scope_hash = %context.storage_key,
                "failed to release idempotency lease"
            );
        }
    }
}

impl Default for IdempotencyInterceptor {
    fn default() -> Self {
        Self::new(IdempotencyConfig::default())
    }
}

impl InvocationInterceptor for IdempotencyInterceptor {
    fn name(&self) -> &str {
        "idempotency"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let Some(context) = idempotency_context(invocation) else {
                return Ok(());
            };
            self.acquire_or_replay(invocation, &context).await
        })
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let Some(context) = owned_idempotency_context(invocation) else {
                return Ok(());
            };
            let store = self.active_store();
            let is_streaming = matches!(
                invocation.dispatch.invocation_shape,
                InvocationShape::SseStream | InvocationShape::ByteStream
            );
            let response = invocation.dispatch.response.as_ref();
            let should_release = is_streaming
                || response.is_none()
                || (!self.config.cache_failures
                    && response.is_some_and(|response| !response.is_success()));

            if should_release {
                if store
                    .release_if_owner(&context.storage_key, &context.owner_token)
                    .await
                    .is_err()
                {
                    tracing::warn!(
                        idempotency_scope_hash = %context.storage_key,
                        "failed to release idempotency lease"
                    );
                }
                return Ok(());
            }

            let response = response.expect("response checked above");
            match store
                .complete_if_owner(
                    &context.storage_key,
                    &context.request_fingerprint,
                    &context.owner_token,
                    response,
                    self.config.ttl,
                )
                .await
            {
                Ok(true) => tracing::debug!(
                    idempotency_scope_hash = %context.storage_key,
                    status_code = response.status_code,
                    "idempotency response committed"
                ),
                Ok(false) => {
                    let _ = store
                        .release_if_owner(&context.storage_key, &context.owner_token)
                        .await;
                    tracing::warn!(
                        idempotency_scope_hash = %context.storage_key,
                        "idempotency response was not cacheable or lease ownership expired"
                    );
                }
                Err(_) => tracing::warn!(
                    idempotency_scope_hash = %context.storage_key,
                    "failed to commit idempotency response"
                ),
            }
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        _error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.release_owned_lease(invocation).await;
            Ok(())
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ExistingEntryResolution {
    Replayed,
    Released,
}

#[derive(Debug, Clone)]
struct IdempotencyRequestContext {
    storage_key: String,
    request_fingerprint: String,
    owner_token: String,
}

fn idempotency_context(invocation: &mut Invocation) -> Option<IdempotencyRequestContext> {
    let raw_key = invocation
        .request
        .idempotency_key
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    let storage_key = idempotency_storage_key(invocation, raw_key);
    let request_fingerprint = idempotency_request_fingerprint(invocation);
    let owner_token = invocation
        .request
        .idempotency_owner_token
        .get_or_insert_with(uuid)
        .clone();
    Some(IdempotencyRequestContext {
        storage_key,
        request_fingerprint,
        owner_token,
    })
}

fn owned_idempotency_context(invocation: &mut Invocation) -> Option<IdempotencyRequestContext> {
    let owner_token = invocation.request.idempotency_owner_token.take()?;
    let raw_key = invocation
        .request
        .idempotency_key
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    Some(IdempotencyRequestContext {
        storage_key: idempotency_storage_key(invocation, raw_key),
        request_fingerprint: idempotency_request_fingerprint(invocation),
        owner_token,
    })
}

fn replay_response(invocation: &mut Invocation, response: InvocationDispatchResponse) {
    invocation.request.idempotency_owner_token = None;
    invocation.dispatch.mode = DispatchMode::SyntheticLocalResponse;
    invocation.dispatch.response = Some(response);
}

fn ensure_matching_fingerprint(expected: &str, actual: &str) -> Result<(), InvocationError> {
    if expected == actual {
        Ok(())
    } else {
        Err(InvocationError::new(
            InvocationErrorKind::Idempotency,
            "idempotency key conflicts with a different request",
        ))
    }
}

fn idempotency_locked_error() -> InvocationError {
    InvocationError::new(
        InvocationErrorKind::Idempotency,
        "idempotency request is still in progress",
    )
}

fn idempotency_store_error(_error: IdempotencyStoreError) -> InvocationError {
    idempotency_store_error_value()
}

fn idempotency_store_error_value() -> InvocationError {
    InvocationError::new(
        InvocationErrorKind::Idempotency,
        "idempotency coordination is unavailable",
    )
}

fn idempotency_storage_key(invocation: &Invocation, raw_key: &str) -> String {
    let mut material = Vec::new();
    append_component(&mut material, "sdkwork-clawrouter-idempotency-scope-v2");
    append_component(
        &mut material,
        invocation_auth_type(&invocation.subject.auth_type),
    );
    append_component(&mut material, &invocation.subject.tenant_id.to_string());
    append_component(
        &mut material,
        &invocation.subject.organization_id.to_string(),
    );
    append_component(
        &mut material,
        &invocation
            .subject
            .api_key_id
            .unwrap_or_default()
            .to_string(),
    );
    append_component(&mut material, &invocation.subject.user_id.to_string());
    append_component(
        &mut material,
        &invocation
            .subject
            .account_group_id
            .unwrap_or_default()
            .to_string(),
    );
    append_component(&mut material, invocation.request.method.as_str());
    append_component(
        &mut material,
        &super::classification::normalize_path(&invocation.request.path),
    );
    append_component(
        &mut material,
        &normalize_query(invocation.request.query.as_deref()),
    );
    append_component(&mut material, raw_key);
    sha256_hash(&material)
}

fn idempotency_request_fingerprint(invocation: &Invocation) -> String {
    let mut material = Vec::new();
    append_component(&mut material, "sdkwork-clawrouter-idempotency-request-v2");
    append_component(&mut material, invocation.request.method.as_str());
    append_component(
        &mut material,
        &super::classification::normalize_path(&invocation.request.path),
    );
    append_component(
        &mut material,
        &normalize_query(invocation.request.query.as_deref()),
    );
    append_component(
        &mut material,
        invocation
            .request
            .content_type
            .as_deref()
            .unwrap_or_default(),
    );
    match &invocation.request.body {
        InvocationBody::Empty => append_component(&mut material, "body:empty"),
        InvocationBody::Bytes(bytes) => {
            append_component(&mut material, "body:bytes");
            append_bytes(&mut material, bytes);
        }
        InvocationBody::Json(value) => {
            append_component(&mut material, "body:json");
            let mut canonical = Vec::new();
            write_canonical_json(value, &mut canonical);
            append_bytes(&mut material, &canonical);
        }
    }
    sha256_hash(&material)
}

fn invocation_auth_type(auth_type: &InvocationAuthType) -> &'static str {
    match auth_type {
        InvocationAuthType::GatewayApiKey => "gateway_api_key",
        InvocationAuthType::AppSession => "app_session",
        InvocationAuthType::AdminSubject => "admin_subject",
        InvocationAuthType::InternalService => "internal_service",
        InvocationAuthType::AnonymousFree => "anonymous_free",
    }
}

fn normalize_query(query: Option<&str>) -> String {
    let mut parts = query
        .unwrap_or_default()
        .split('&')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();
    parts.sort();
    parts.join("&")
}

fn append_component(target: &mut Vec<u8>, value: &str) {
    append_bytes(target, value.as_bytes());
}

fn append_bytes(target: &mut Vec<u8>, value: &[u8]) {
    target.extend_from_slice(value.len().to_string().as_bytes());
    target.push(b':');
    target.extend_from_slice(value);
    target.push(b'|');
}

fn write_canonical_json(value: &serde_json::Value, target: &mut Vec<u8>) {
    match value {
        serde_json::Value::Null => target.extend_from_slice(b"null"),
        serde_json::Value::Bool(value) => {
            target.extend_from_slice(if *value { b"true" } else { b"false" })
        }
        serde_json::Value::Number(value) => target.extend_from_slice(value.to_string().as_bytes()),
        serde_json::Value::String(value) => {
            target.extend_from_slice(
                serde_json::to_string(value)
                    .expect("serializing a JSON string cannot fail")
                    .as_bytes(),
            );
        }
        serde_json::Value::Array(values) => {
            target.push(b'[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    target.push(b',');
                }
                write_canonical_json(value, target);
            }
            target.push(b']');
        }
        serde_json::Value::Object(values) => {
            target.push(b'{');
            let mut keys = values.keys().collect::<Vec<_>>();
            keys.sort();
            for (index, key) in keys.into_iter().enumerate() {
                if index > 0 {
                    target.push(b',');
                }
                target.extend_from_slice(
                    serde_json::to_string(key)
                        .expect("serializing a JSON object key cannot fail")
                        .as_bytes(),
                );
                target.push(b':');
                write_canonical_json(&values[key], target);
            }
            target.push(b'}');
        }
    }
}

#[derive(Debug, Clone)]
struct LocalStoredRecord {
    value: StoredIdempotencyRecord,
    created_at: Instant,
    expires_at: Instant,
}

#[derive(Debug)]
struct LocalIdempotencyStore {
    cache: Mutex<HashMap<String, LocalStoredRecord>>,
    max_entries: usize,
}

impl LocalIdempotencyStore {
    fn new(max_entries: usize) -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
            max_entries: max_entries.max(1),
        }
    }

    fn lock_cache(&self) -> std::sync::MutexGuard<'_, HashMap<String, LocalStoredRecord>> {
        match self.cache.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        }
    }

    fn purge_expired(cache: &mut HashMap<String, LocalStoredRecord>, now: Instant) {
        cache.retain(|_, record| record.expires_at > now);
    }

    fn reserve_capacity(
        &self,
        cache: &mut HashMap<String, LocalStoredRecord>,
    ) -> Result<(), IdempotencyStoreError> {
        Self::purge_expired(cache, Instant::now());
        if cache.len() < self.max_entries {
            return Ok(());
        }
        let evictable = cache
            .iter()
            .filter(|(_, record)| record.value.status != IdempotencyKeyStatus::InProgress)
            .min_by_key(|(_, record)| record.created_at)
            .map(|(key, _)| key.clone());
        if let Some(key) = evictable {
            cache.remove(&key);
            Ok(())
        } else {
            Err(IdempotencyStoreError)
        }
    }
}

#[async_trait::async_trait]
impl IdempotencyStore for LocalIdempotencyStore {
    async fn lookup(
        &self,
        storage_key: &str,
    ) -> Result<Option<IdempotencyStoreEntry>, IdempotencyStoreError> {
        let mut cache = self.lock_cache();
        let now = Instant::now();
        if cache
            .get(storage_key)
            .is_some_and(|record| record.expires_at <= now)
        {
            cache.remove(storage_key);
            return Ok(None);
        }
        Ok(cache
            .get(storage_key)
            .map(|record| record.value.to_store_entry()))
    }

    async fn try_acquire_lock(
        &self,
        storage_key: &str,
        request_fingerprint: &str,
        owner_token: &str,
        ttl: Duration,
    ) -> Result<IdempotencyLockAcquisition, IdempotencyStoreError> {
        let mut cache = self.lock_cache();
        let now = Instant::now();
        if cache
            .get(storage_key)
            .is_some_and(|record| record.expires_at <= now)
        {
            cache.remove(storage_key);
        }
        if cache.contains_key(storage_key) {
            return Ok(IdempotencyLockAcquisition::Contended);
        }
        self.reserve_capacity(&mut cache)?;
        cache.insert(
            storage_key.to_owned(),
            LocalStoredRecord {
                value: StoredIdempotencyRecord::in_progress(request_fingerprint, owner_token),
                created_at: now,
                expires_at: now + nonzero_duration(ttl),
            },
        );
        Ok(IdempotencyLockAcquisition::Acquired)
    }

    async fn complete_if_owner(
        &self,
        storage_key: &str,
        request_fingerprint: &str,
        owner_token: &str,
        response: &InvocationDispatchResponse,
        ttl: Duration,
    ) -> Result<bool, IdempotencyStoreError> {
        let Some(completed) =
            StoredIdempotencyRecord::completed(request_fingerprint, owner_token, response)
        else {
            return Ok(false);
        };
        let mut cache = self.lock_cache();
        let now = Instant::now();
        let Some(current) = cache.get(storage_key) else {
            return Ok(false);
        };
        if current.expires_at <= now {
            cache.remove(storage_key);
            return Ok(false);
        }
        if !current
            .value
            .is_owned_in_progress(request_fingerprint, owner_token)
        {
            return Ok(false);
        }
        cache.insert(
            storage_key.to_owned(),
            LocalStoredRecord {
                value: completed,
                created_at: now,
                expires_at: now + nonzero_duration(ttl),
            },
        );
        Ok(true)
    }

    async fn release_if_owner(
        &self,
        storage_key: &str,
        owner_token: &str,
    ) -> Result<bool, IdempotencyStoreError> {
        let mut cache = self.lock_cache();
        let should_remove = cache.get(storage_key).is_some_and(|record| {
            record.value.status == IdempotencyKeyStatus::InProgress
                && record.value.owner_token == owner_token
        });
        if should_remove {
            cache.remove(storage_key);
        }
        Ok(should_remove)
    }

    fn is_distributed_ha(&self) -> bool {
        false
    }
}

#[derive(Debug)]
struct UnavailableIdempotencyStore;

#[async_trait::async_trait]
impl IdempotencyStore for UnavailableIdempotencyStore {
    async fn lookup(
        &self,
        _storage_key: &str,
    ) -> Result<Option<IdempotencyStoreEntry>, IdempotencyStoreError> {
        Err(IdempotencyStoreError)
    }

    async fn try_acquire_lock(
        &self,
        _storage_key: &str,
        _request_fingerprint: &str,
        _owner_token: &str,
        _ttl: Duration,
    ) -> Result<IdempotencyLockAcquisition, IdempotencyStoreError> {
        Err(IdempotencyStoreError)
    }

    async fn complete_if_owner(
        &self,
        _storage_key: &str,
        _request_fingerprint: &str,
        _owner_token: &str,
        _response: &InvocationDispatchResponse,
        _ttl: Duration,
    ) -> Result<bool, IdempotencyStoreError> {
        Err(IdempotencyStoreError)
    }

    async fn release_if_owner(
        &self,
        _storage_key: &str,
        _owner_token: &str,
    ) -> Result<bool, IdempotencyStoreError> {
        Err(IdempotencyStoreError)
    }

    fn is_distributed_ha(&self) -> bool {
        false
    }
}

struct RedisIdempotencyStore {
    client: redis::Client,
    key_prefix: String,
}

impl RedisIdempotencyStore {
    fn try_new(url: &str, prefix: &str) -> Result<Self, IdempotencyStoreError> {
        let client = redis::Client::open(url).map_err(|_| IdempotencyStoreError)?;
        Ok(Self {
            client,
            key_prefix: format!("{prefix}:idempotency:v2"),
        })
    }

    fn redis_key(&self, storage_key: &str) -> String {
        format!("{}:{storage_key}", self.key_prefix)
    }

    fn lua_complete_if_owner() -> &'static str {
        r#"
        local current = redis.call('GET', KEYS[1])
        if not current then return 0 end
        local ok, record = pcall(cjson.decode, current)
        if not ok then return -1 end
        if record.status ~= 'in_progress' then return 0 end
        if record.owner_token ~= ARGV[1] then return 0 end
        if record.request_fingerprint ~= ARGV[2] then return 0 end
        redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[4])
        return 1
        "#
    }

    fn lua_release_if_owner() -> &'static str {
        r#"
        local current = redis.call('GET', KEYS[1])
        if not current then return 0 end
        local ok, record = pcall(cjson.decode, current)
        if not ok then return -1 end
        if record.status ~= 'in_progress' then return 0 end
        if record.owner_token ~= ARGV[1] then return 0 end
        redis.call('DEL', KEYS[1])
        return 1
        "#
    }
}

#[async_trait::async_trait]
impl IdempotencyStore for RedisIdempotencyStore {
    async fn lookup(
        &self,
        storage_key: &str,
    ) -> Result<Option<IdempotencyStoreEntry>, IdempotencyStoreError> {
        let mut connection = self
            .client
            .get_multiplexed_async_connection()
            .await
            .map_err(|_| IdempotencyStoreError)?;
        let value: Option<String> = redis::cmd("GET")
            .arg(self.redis_key(storage_key))
            .query_async(&mut connection)
            .await
            .map_err(|_| IdempotencyStoreError)?;
        value
            .map(|value| {
                serde_json::from_str::<StoredIdempotencyRecord>(&value)
                    .map(|record| record.to_store_entry())
                    .map_err(|_| IdempotencyStoreError)
            })
            .transpose()
    }

    async fn try_acquire_lock(
        &self,
        storage_key: &str,
        request_fingerprint: &str,
        owner_token: &str,
        ttl: Duration,
    ) -> Result<IdempotencyLockAcquisition, IdempotencyStoreError> {
        let payload = serde_json::to_string(&StoredIdempotencyRecord::in_progress(
            request_fingerprint,
            owner_token,
        ))
        .map_err(|_| IdempotencyStoreError)?;
        let mut connection = self
            .client
            .get_multiplexed_async_connection()
            .await
            .map_err(|_| IdempotencyStoreError)?;
        let result: Option<String> = redis::cmd("SET")
            .arg(self.redis_key(storage_key))
            .arg(payload)
            .arg("NX")
            .arg("EX")
            .arg(ttl_seconds(ttl))
            .query_async(&mut connection)
            .await
            .map_err(|_| IdempotencyStoreError)?;
        Ok(if result.is_some() {
            IdempotencyLockAcquisition::Acquired
        } else {
            IdempotencyLockAcquisition::Contended
        })
    }

    async fn complete_if_owner(
        &self,
        storage_key: &str,
        request_fingerprint: &str,
        owner_token: &str,
        response: &InvocationDispatchResponse,
        ttl: Duration,
    ) -> Result<bool, IdempotencyStoreError> {
        let Some(completed) =
            StoredIdempotencyRecord::completed(request_fingerprint, owner_token, response)
        else {
            return Ok(false);
        };
        let payload = serde_json::to_string(&completed).map_err(|_| IdempotencyStoreError)?;
        let mut connection = self
            .client
            .get_multiplexed_async_connection()
            .await
            .map_err(|_| IdempotencyStoreError)?;
        let result: i64 = redis::cmd("EVAL")
            .arg(Self::lua_complete_if_owner())
            .arg(1)
            .arg(self.redis_key(storage_key))
            .arg(owner_token)
            .arg(request_fingerprint)
            .arg(payload)
            .arg(ttl_seconds(ttl))
            .query_async(&mut connection)
            .await
            .map_err(|_| IdempotencyStoreError)?;
        if result < 0 {
            return Err(IdempotencyStoreError);
        }
        Ok(result == 1)
    }

    async fn release_if_owner(
        &self,
        storage_key: &str,
        owner_token: &str,
    ) -> Result<bool, IdempotencyStoreError> {
        let mut connection = self
            .client
            .get_multiplexed_async_connection()
            .await
            .map_err(|_| IdempotencyStoreError)?;
        let result: i64 = redis::cmd("EVAL")
            .arg(Self::lua_release_if_owner())
            .arg(1)
            .arg(self.redis_key(storage_key))
            .arg(owner_token)
            .query_async(&mut connection)
            .await
            .map_err(|_| IdempotencyStoreError)?;
        if result < 0 {
            return Err(IdempotencyStoreError);
        }
        Ok(result == 1)
    }

    fn is_distributed_ha(&self) -> bool {
        true
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredIdempotencyRecord {
    status: IdempotencyKeyStatus,
    request_fingerprint: String,
    owner_token: String,
    response: Option<CachedResponsePayload>,
}

impl StoredIdempotencyRecord {
    fn in_progress(request_fingerprint: &str, owner_token: &str) -> Self {
        Self {
            status: IdempotencyKeyStatus::InProgress,
            request_fingerprint: request_fingerprint.to_owned(),
            owner_token: owner_token.to_owned(),
            response: None,
        }
    }

    fn completed(
        request_fingerprint: &str,
        owner_token: &str,
        response: &InvocationDispatchResponse,
    ) -> Option<Self> {
        let status = if response.is_success() {
            IdempotencyKeyStatus::Completed
        } else {
            IdempotencyKeyStatus::Failed
        };
        let response = CachedResponsePayload::from_response(response)?;
        Some(Self {
            status,
            request_fingerprint: request_fingerprint.to_owned(),
            owner_token: owner_token.to_owned(),
            response: Some(response),
        })
    }

    fn is_owned_in_progress(&self, request_fingerprint: &str, owner_token: &str) -> bool {
        self.status == IdempotencyKeyStatus::InProgress
            && self.request_fingerprint == request_fingerprint
            && self.owner_token == owner_token
    }

    fn to_store_entry(&self) -> IdempotencyStoreEntry {
        IdempotencyStoreEntry {
            status: self.status,
            request_fingerprint: self.request_fingerprint.clone(),
            response: self
                .response
                .as_ref()
                .map(CachedResponsePayload::to_dispatch_response),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CachedResponsePayload {
    status_code: u16,
    body: Option<serde_json::Value>,
    body_bytes: Option<Vec<u8>>,
    content_type: Option<String>,
}

impl CachedResponsePayload {
    fn from_response(response: &InvocationDispatchResponse) -> Option<Self> {
        let stream_body = response.stream_body.lock().ok()?;
        if stream_body.is_some() {
            return None;
        }
        drop(stream_body);
        Some(Self {
            status_code: response.status_code,
            body: response.body.clone(),
            body_bytes: response.body_bytes.clone(),
            content_type: response.content_type.clone(),
        })
    }

    fn to_dispatch_response(&self) -> InvocationDispatchResponse {
        InvocationDispatchResponse {
            status_code: self.status_code,
            body: self.body.clone(),
            body_bytes: self.body_bytes.clone(),
            content_type: self.content_type.clone(),
            stream_body: Mutex::new(None),
        }
    }
}

fn nonzero_duration(value: Duration) -> Duration {
    value.max(Duration::from_millis(1))
}

fn ttl_seconds(value: Duration) -> u64 {
    value.as_secs().max(1)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{
        InvocationBilling, InvocationRequest, InvocationResource, InvocationSubject,
    };
    use crate::domain::RoutingCapability;
    use axum::http::Method;
    use serde_json::json;

    fn response(status_code: u16, marker: &str) -> InvocationDispatchResponse {
        InvocationDispatchResponse::json(status_code, json!({"marker": marker}))
    }

    fn invocation(
        request_id: &str,
        tenant_id: i64,
        organization_id: i64,
        api_key_id: i64,
        user_id: i64,
        raw_key: &str,
        body: serde_json::Value,
    ) -> Invocation {
        let mut request =
            InvocationRequest::new(Method::POST, "/v1/chat/completions?mode=fast&region=global")
                .with_request_id(request_id)
                .with_body(InvocationBody::json(body));
        request.idempotency_key = Some(raw_key.to_owned());
        request.content_type = Some("application/json".to_owned());
        Invocation::new(
            request,
            InvocationSubject {
                auth_type: InvocationAuthType::GatewayApiKey,
                api_key_id: Some(api_key_id),
                api_key_name_snapshot: None,
                tenant_id,
                organization_id,
                user_id,
                account_group_id: Some(10),
                account_group_code: Some("standard".to_owned()),
                pricing_plan_code: Some("standard".to_owned()),
                roles: Vec::new(),
                scopes: Vec::new(),
            },
            InvocationResource::api_resource(
                "openai/chat/completions",
                "openai.chat.completions",
                RoutingCapability::Chat,
            ),
            InvocationBilling::free(),
        )
    }

    async fn complete(
        interceptor: &IdempotencyInterceptor,
        invocation: &mut Invocation,
        marker: &str,
    ) {
        interceptor
            .before(invocation)
            .await
            .expect("acquire idempotency lease");
        invocation.dispatch.response = Some(response(200, marker));
        interceptor
            .after(invocation)
            .await
            .expect("commit idempotency response");
    }

    #[tokio::test]
    async fn scopes_same_raw_key_by_tenant_organization_api_key_and_user() {
        let interceptor = IdempotencyInterceptor::default();
        let mut first = invocation(
            "req-tenant-a",
            100,
            200,
            300,
            400,
            "shared-client-key",
            json!({"model": "gpt-4o-mini"}),
        );
        complete(&interceptor, &mut first, "tenant-a").await;

        for (request_id, tenant_id, organization_id, api_key_id, user_id) in [
            ("req-tenant-b", 101, 200, 300, 400),
            ("req-org-b", 100, 201, 300, 400),
            ("req-key-b", 100, 200, 301, 400),
            ("req-user-b", 100, 200, 300, 401),
        ] {
            let mut other = invocation(
                request_id,
                tenant_id,
                organization_id,
                api_key_id,
                user_id,
                "shared-client-key",
                json!({"model": "gpt-4o-mini"}),
            );
            interceptor
                .before(&mut other)
                .await
                .expect("identity-scoped request acquires an independent lease");
            assert_ne!(DispatchMode::SyntheticLocalResponse, other.dispatch.mode);
            interceptor
                .on_error(
                    &mut other,
                    &InvocationError::new(InvocationErrorKind::Dispatch, "test cleanup"),
                )
                .await
                .expect("release test lease");
        }
    }

    #[tokio::test]
    async fn rejects_same_scoped_key_with_different_payload() {
        let interceptor = IdempotencyInterceptor::default();
        let mut first = invocation(
            "req-first",
            100,
            200,
            300,
            400,
            "secret-looking-key-must-not-leak",
            json!({"prompt": "private-first-prompt"}),
        );
        complete(&interceptor, &mut first, "first").await;

        let mut conflicting = invocation(
            "req-conflict",
            100,
            200,
            300,
            400,
            "secret-looking-key-must-not-leak",
            json!({"prompt": "private-second-prompt"}),
        );
        let error = interceptor
            .before(&mut conflicting)
            .await
            .expect_err("payload mismatch must be a conflict");

        assert_eq!(InvocationErrorKind::Idempotency, error.kind);
        assert!(error.message.contains("different request"));
        assert!(!error.message.contains("secret-looking-key"));
        assert!(!error.message.contains("private-first-prompt"));
        assert!(!error.message.contains("private-second-prompt"));
        assert!(conflicting.dispatch.response.is_none());
    }

    #[tokio::test]
    async fn canonical_json_and_query_order_replay_the_same_request() {
        let interceptor = IdempotencyInterceptor::default();
        let mut first = invocation(
            "req-canonical-first",
            100,
            200,
            300,
            400,
            "canonical-key",
            json!({"model": "gpt-4o-mini", "input": {"b": 2, "a": 1}}),
        );
        complete(&interceptor, &mut first, "canonical").await;

        let mut replay = invocation(
            "req-canonical-replay",
            100,
            200,
            300,
            400,
            "canonical-key",
            json!({"input": {"a": 1, "b": 2}, "model": "gpt-4o-mini"}),
        );
        replay.request.query = Some("region=global&mode=fast".to_owned());
        interceptor
            .before(&mut replay)
            .await
            .expect("canonical request should replay");

        assert_eq!(DispatchMode::SyntheticLocalResponse, replay.dispatch.mode);
        assert_eq!(
            Some("canonical"),
            replay
                .dispatch
                .response
                .as_ref()
                .and_then(|response| response.body.as_ref())
                .and_then(|body| body.get("marker"))
                .and_then(serde_json::Value::as_str)
        );
    }

    #[tokio::test]
    async fn releases_owned_lease_on_pipeline_error() {
        let interceptor = IdempotencyInterceptor::default();
        let mut failed = invocation(
            "req-failed",
            100,
            200,
            300,
            400,
            "retry-after-error",
            json!({"model": "gpt-4o-mini"}),
        );
        interceptor
            .before(&mut failed)
            .await
            .expect("first request acquires lease");
        interceptor
            .on_error(
                &mut failed,
                &InvocationError::new(InvocationErrorKind::Dispatch, "provider failed"),
            )
            .await
            .expect("error cleanup");

        let mut retry = invocation(
            "req-retry",
            100,
            200,
            300,
            400,
            "retry-after-error",
            json!({"model": "gpt-4o-mini"}),
        );
        interceptor
            .before(&mut retry)
            .await
            .expect("retry acquires released lease");
        assert_ne!(DispatchMode::SyntheticLocalResponse, retry.dispatch.mode);
        interceptor
            .on_error(
                &mut retry,
                &InvocationError::new(InvocationErrorKind::Dispatch, "test cleanup"),
            )
            .await
            .expect("retry cleanup");
    }

    #[tokio::test]
    async fn expired_owner_cannot_overwrite_or_release_new_owner() {
        let store = LocalIdempotencyStore::new(8);
        assert_eq!(
            IdempotencyLockAcquisition::Acquired,
            store
                .try_acquire_lock(
                    "scope-hash",
                    "fingerprint",
                    "owner-old",
                    Duration::from_millis(1),
                )
                .await
                .expect("old owner")
        );
        tokio::time::sleep(Duration::from_millis(5)).await;
        assert_eq!(
            IdempotencyLockAcquisition::Acquired,
            store
                .try_acquire_lock(
                    "scope-hash",
                    "fingerprint",
                    "owner-new",
                    Duration::from_secs(1),
                )
                .await
                .expect("new owner")
        );

        assert!(!store
            .complete_if_owner(
                "scope-hash",
                "fingerprint",
                "owner-old",
                &response(200, "stale"),
                Duration::from_secs(1),
            )
            .await
            .expect("stale completion is rejected"));
        assert!(!store
            .release_if_owner("scope-hash", "owner-old")
            .await
            .expect("stale release is rejected"));
        assert_eq!(
            IdempotencyKeyStatus::InProgress,
            store
                .lookup("scope-hash")
                .await
                .expect("lookup")
                .expect("new lease remains")
                .status
        );
        assert!(store
            .complete_if_owner(
                "scope-hash",
                "fingerprint",
                "owner-new",
                &response(200, "fresh"),
                Duration::from_secs(1),
            )
            .await
            .expect("new completion"));
        assert_eq!(
            Some("fresh"),
            store
                .lookup("scope-hash")
                .await
                .expect("lookup")
                .and_then(|entry| entry.response)
                .and_then(|response| response.body)
                .and_then(|body| body.get("marker").cloned())
                .and_then(|value| value.as_str().map(str::to_owned))
                .as_deref()
        );
    }

    #[test]
    fn redis_completion_and_release_scripts_require_owner_token() {
        let complete = RedisIdempotencyStore::lua_complete_if_owner();
        let release = RedisIdempotencyStore::lua_release_if_owner();

        assert!(complete.contains("record.owner_token ~= ARGV[1]"));
        assert!(complete.contains("record.request_fingerprint ~= ARGV[2]"));
        assert!(release.contains("record.owner_token ~= ARGV[1]"));
        assert!(release.contains("redis.call('DEL', KEYS[1])"));
    }
}
