use std::time::Duration;

use redis::aio::ConnectionManager;

use crate::application::{RuntimeStreamBus, RuntimeStreamBusFuture};
use crate::domain::{DomainError, DomainResult};
use crate::ports::AppRuntimeEventItem;

const DEFAULT_RUNTIME_STREAM_KEY_PREFIX: &str = "clawrouter";
const DEFAULT_RUNTIME_STREAM_MAX_LEN: usize = 10_000;
const DEFAULT_RUNTIME_STREAM_TTL_SECONDS: u64 = 86_400;

#[derive(Debug, Clone)]
pub struct RedisRuntimeStreamBus {
    connection: ConnectionManager,
    command_timeout: Duration,
    key_prefix: String,
    stream_max_len: usize,
    stream_ttl_seconds: u64,
}

impl RedisRuntimeStreamBus {
    pub async fn connect(
        redis_url: impl AsRef<str>,
        key_prefix: Option<&str>,
        command_timeout: Duration,
    ) -> DomainResult<Self> {
        let client = redis::Client::open(redis_url.as_ref()).map_err(|error| {
            DomainError::new(format!("redis runtime stream url is invalid: {error}"))
        })?;
        let connection = tokio::time::timeout(command_timeout, client.get_connection_manager())
            .await
            .map_err(|_| DomainError::new("redis runtime stream connection timed out"))?
            .map_err(|error| {
                DomainError::new(format!("redis runtime stream connection failed: {error}"))
            })?;
        Ok(Self {
            connection,
            command_timeout,
            key_prefix: normalize_key_prefix(key_prefix),
            stream_max_len: DEFAULT_RUNTIME_STREAM_MAX_LEN,
            stream_ttl_seconds: DEFAULT_RUNTIME_STREAM_TTL_SECONDS,
        })
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

    fn connection(&self) -> ConnectionManager {
        self.connection.clone()
    }

    fn stream_key(&self, invocation_id: &str) -> String {
        format!(
            "{}:runtime:invocation:{}:events",
            self.key_prefix, invocation_id
        )
    }

    fn execution_lock_key(&self, invocation_id: &str) -> String {
        format!(
            "{}:runtime:invocation:{}:execution-lock",
            self.key_prefix, invocation_id
        )
    }

    fn cancellation_key(&self, invocation_id: &str) -> String {
        format!(
            "{}:runtime:invocation:{}:cancellation",
            self.key_prefix, invocation_id
        )
    }
}

impl RuntimeStreamBus for RedisRuntimeStreamBus {
    fn claim_execution<'a>(
        &'a self,
        invocation_id: &'a str,
        owner_id: &'a str,
        lease_ttl: Duration,
    ) -> RuntimeStreamBusFuture<'a, bool> {
        Box::pin(async move {
            let mut connection = self.connection();
            let result: Option<String> = self
                .with_timeout(
                    redis::cmd("SET")
                        .arg(self.execution_lock_key(invocation_id))
                        .arg(owner_id)
                        .arg("NX")
                        .arg("PX")
                        .arg(duration_millis(lease_ttl))
                        .query_async(&mut connection),
                    "redis runtime stream claim execution",
                )
                .await?;
            Ok(result.as_deref() == Some("OK"))
        })
    }

    fn renew_execution<'a>(
        &'a self,
        invocation_id: &'a str,
        owner_id: &'a str,
        lease_ttl: Duration,
    ) -> RuntimeStreamBusFuture<'a, bool> {
        Box::pin(async move {
            let mut connection = self.connection();
            let renewed: i64 = self
                .with_timeout(
                    redis::Script::new(
                        r#"
                        if redis.call('GET', KEYS[1]) == ARGV[1] then
                            return redis.call('PEXPIRE', KEYS[1], ARGV[2])
                        end
                        return 0
                        "#,
                    )
                    .key(self.execution_lock_key(invocation_id))
                    .arg(owner_id)
                    .arg(duration_millis(lease_ttl))
                    .invoke_async(&mut connection),
                    "redis runtime stream renew execution",
                )
                .await?;
            Ok(renewed == 1)
        })
    }

    fn release_execution<'a>(
        &'a self,
        invocation_id: &'a str,
        owner_id: &'a str,
    ) -> RuntimeStreamBusFuture<'a, ()> {
        Box::pin(async move {
            let mut connection = self.connection();
            let _: i64 = self
                .with_timeout(
                    redis::Script::new(
                        r#"
                        if redis.call('GET', KEYS[1]) == ARGV[1] then
                            return redis.call('DEL', KEYS[1])
                        end
                        return 0
                        "#,
                    )
                    .key(self.execution_lock_key(invocation_id))
                    .arg(owner_id)
                    .invoke_async(&mut connection),
                    "redis runtime stream release execution",
                )
                .await?;
            Ok(())
        })
    }

    fn publish_event<'a>(
        &'a self,
        invocation_id: &'a str,
        event: &'a AppRuntimeEventItem,
    ) -> RuntimeStreamBusFuture<'a, ()> {
        Box::pin(async move {
            let payload = serde_json::to_string(event).map_err(|error| {
                DomainError::new(format!(
                    "runtime stream event serialization failed: {error}"
                ))
            })?;
            let stream_key = self.stream_key(invocation_id);
            let mut connection = self.connection();
            let _: String = self
                .with_timeout(
                    redis::cmd("XADD")
                        .arg(&stream_key)
                        .arg("MAXLEN")
                        .arg("~")
                        .arg(self.stream_max_len)
                        .arg("*")
                        .arg("eventNo")
                        .arg(event.event_no)
                        .arg("eventType")
                        .arg(event.event_type.as_str())
                        .arg("payload")
                        .arg(payload)
                        .query_async(&mut connection),
                    "redis runtime stream publish event",
                )
                .await?;
            let _: i64 = self
                .with_timeout(
                    redis::cmd("EXPIRE")
                        .arg(&stream_key)
                        .arg(self.stream_ttl_seconds)
                        .query_async(&mut connection),
                    "redis runtime stream expire event stream",
                )
                .await?;
            Ok(())
        })
    }

    fn wait_for_event<'a>(
        &'a self,
        invocation_id: &'a str,
        timeout: Duration,
    ) -> RuntimeStreamBusFuture<'a, ()> {
        Box::pin(async move {
            let mut connection = self.connection();
            let _: redis::Value = self
                .with_timeout(
                    redis::cmd("XREAD")
                        .arg("BLOCK")
                        .arg(duration_millis(timeout))
                        .arg("COUNT")
                        .arg(1_u32)
                        .arg("STREAMS")
                        .arg(self.stream_key(invocation_id))
                        .arg("$")
                        .query_async(&mut connection),
                    "redis runtime stream wait for event",
                )
                .await?;
            Ok(())
        })
    }

    fn request_cancellation<'a>(
        &'a self,
        invocation_id: &'a str,
        reason: &'a str,
        ttl: Duration,
    ) -> RuntimeStreamBusFuture<'a, ()> {
        Box::pin(async move {
            let mut connection = self.connection();
            let result: Option<String> = self
                .with_timeout(
                    redis::cmd("SET")
                        .arg(self.cancellation_key(invocation_id))
                        .arg(reason)
                        .arg("PX")
                        .arg(duration_millis(ttl))
                        .query_async(&mut connection),
                    "redis runtime stream request cancellation",
                )
                .await?;
            if result.as_deref() != Some("OK") {
                return Err(DomainError::new(
                    "redis runtime stream cancellation request was not acknowledged",
                ));
            }
            Ok(())
        })
    }

    fn cancellation_reason<'a>(
        &'a self,
        invocation_id: &'a str,
    ) -> RuntimeStreamBusFuture<'a, Option<String>> {
        Box::pin(async move {
            let mut connection = self.connection();
            self.with_timeout(
                redis::cmd("GET")
                    .arg(self.cancellation_key(invocation_id))
                    .query_async(&mut connection),
                "redis runtime stream read cancellation",
            )
            .await
        })
    }
}

fn duration_millis(duration: Duration) -> u64 {
    u64::try_from(duration.as_millis())
        .unwrap_or(u64::MAX)
        .max(1)
}

fn normalize_key_prefix(value: Option<&str>) -> String {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_RUNTIME_STREAM_KEY_PREFIX)
        .trim_matches(':')
        .to_owned()
}
