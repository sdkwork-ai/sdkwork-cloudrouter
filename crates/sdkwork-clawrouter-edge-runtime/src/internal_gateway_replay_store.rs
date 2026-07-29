use std::sync::Arc;
use std::time::Duration;

use redis::aio::ConnectionManager;
use sdkwork_claw_security::{
    InternalGatewayAuthError, InternalGatewayReplayStore, InternalGatewayReplayStoreFuture,
};
use sha2::{Digest, Sha256};
use tokio::sync::OnceCell;

pub(crate) struct RedisInternalGatewayReplayStore {
    client: redis::Client,
    connection: Arc<OnceCell<ConnectionManager>>,
    key_prefix: String,
    command_timeout: Duration,
}

impl RedisInternalGatewayReplayStore {
    pub(crate) fn new(
        redis_url: &str,
        key_prefix: Option<&str>,
        command_timeout_millis: u64,
    ) -> Result<Self, String> {
        let client = redis::Client::open(redis_url)
            .map_err(|error| format!("invalid Redis replay-store configuration: {error}"))?;
        let key_prefix = key_prefix
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("clawrouter")
            .trim_end_matches(':')
            .to_owned();
        Ok(Self {
            client,
            connection: Arc::new(OnceCell::new()),
            key_prefix,
            command_timeout: Duration::from_millis(command_timeout_millis.max(1)),
        })
    }

    async fn connection(&self) -> Result<ConnectionManager, InternalGatewayAuthError> {
        let client = self.client.clone();
        let connection = self
            .connection
            .get_or_try_init(|| async move { ConnectionManager::new(client).await })
            .await
            .map_err(|_| InternalGatewayAuthError::ReplayCacheUnavailable)?;
        Ok(connection.clone())
    }

    fn nonce_key(&self, nonce: &str) -> String {
        let digest = Sha256::digest(nonce.as_bytes());
        format!(
            "{}:security:internal-gateway-replay:{}",
            self.key_prefix,
            hex::encode(digest)
        )
    }
}

impl InternalGatewayReplayStore for RedisInternalGatewayReplayStore {
    fn consume<'a>(
        &'a self,
        nonce: &'a str,
        retain_until: u64,
        now: u64,
    ) -> InternalGatewayReplayStoreFuture<'a> {
        Box::pin(async move {
            let ttl_seconds = retain_until.saturating_sub(now).max(1);
            let mut connection = self.connection().await?;
            let result: Option<String> = tokio::time::timeout(
                self.command_timeout,
                redis::cmd("SET")
                    .arg(self.nonce_key(nonce))
                    .arg("1")
                    .arg("NX")
                    .arg("EX")
                    .arg(ttl_seconds)
                    .query_async(&mut connection),
            )
            .await
            .map_err(|_| InternalGatewayAuthError::ReplayCacheUnavailable)?
            .map_err(|_| InternalGatewayAuthError::ReplayCacheUnavailable)?;
            if result.is_none() {
                return Err(InternalGatewayAuthError::Replayed);
            }
            Ok(())
        })
    }
}
