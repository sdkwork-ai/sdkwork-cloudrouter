//! Shared self-healing Redis connection slot.
//!
//! Several gateway stores (circuit breaker, idempotency, tenant in-flight,
//! accounting retry queue) need a long-lived Redis connection on a low-QPS
//! path. A bare `OnceCell<ConnectionManager>` keeps a dead TCP handle forever:
//! the socket can be dropped by NAT/conntrack or by a client-side driver
//! failure during a long idle window, and the next command fails with
//! `broken pipe` without any chance to recover.
//!
//! This slot owns the connection behind a replaceable slot, keeps it warm with
//! a bounded PING every [`KEEPALIVE_INTERVAL`], and discards it on failure so
//! the next caller opens a fresh one. The keepalive task holds a `Weak`
//! reference and exits when the owning store is dropped.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Weak};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use redis::aio::{ConnectionManager, ConnectionManagerConfig};

/// Upper bound for opening a connection to Redis.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(2);

/// Background keepalive cadence. Long idle gaps are normal for gateway AI
/// traffic; a 30s PING prevents the socket from being silently dropped and
/// detects a broken link before a user request depends on it.
const KEEPALIVE_INTERVAL: Duration = Duration::from_secs(30);

/// A Redis connection that survives idle periods and client-side link loss.
pub(crate) struct RedisConnectionSlot {
    client: redis::Client,
    slot: tokio::sync::Mutex<Option<ConnectionManager>>,
    command_timeout: Duration,
    last_used_at: AtomicU64,
    generation: AtomicU64,
}

impl RedisConnectionSlot {
    /// Creates the slot and starts its keepalive task when a Tokio runtime is
    /// available. The task holds only a `Weak` reference, so it stops when the
    /// owning store is dropped.
    pub(crate) fn new(client: redis::Client, command_timeout: Duration) -> Arc<Self> {
        let slot = Arc::new(Self {
            client,
            slot: tokio::sync::Mutex::new(None),
            command_timeout,
            last_used_at: AtomicU64::new(0),
            generation: AtomicU64::new(0),
        });
        slot.spawn_keepalive();
        slot
    }

    /// Returns a live connection, opening one when the slot is empty.
    pub(crate) async fn get(&self) -> Option<ConnectionManager> {
        let mut slot = self.slot.lock().await;
        if slot.is_none() {
            let opened = self
                .client
                .get_connection_manager_with_config(
                    ConnectionManagerConfig::new()
                        .set_connection_timeout(Some(CONNECT_TIMEOUT))
                        .set_response_timeout(Some(self.command_timeout))
                        .set_number_of_retries(2),
                )
                .await
                .ok();
            if opened.is_some() {
                let generation = self.generation.fetch_add(1, Ordering::Relaxed) + 1;
                self.last_used_at
                    .store(unix_now_seconds(), Ordering::Relaxed);
                tracing::info!(generation, "resilient Redis connection opened");
            }
            *slot = opened;
        }
        slot.clone()
    }

    /// Drops the cached connection so the next caller re-opens it.
    pub(crate) async fn discard(&self) {
        let had_connection = self.slot.lock().await.take().is_some();
        if had_connection {
            tracing::warn!(
                generation = self.generation.load(Ordering::Relaxed),
                "resilient Redis connection discarded"
            );
        }
    }

    async fn probe(&self) -> Result<(), String> {
        let Some(mut conn) = self.get().await else {
            return Err("redis connection unavailable".to_owned());
        };
        match tokio::time::timeout(
            self.command_timeout,
            redis::cmd("PING").query_async::<String>(&mut conn),
        )
        .await
        {
            Ok(Ok(_)) => {
                self.last_used_at
                    .store(unix_now_seconds(), Ordering::Relaxed);
                Ok(())
            }
            Ok(Err(error)) => Err(error.to_string()),
            Err(_) => Err("redis PING timed out".to_owned()),
        }
    }

    async fn keepalive(&self) {
        if let Err(error) = self.probe().await {
            tracing::warn!(
                error = %error,
                "resilient Redis keepalive failed; discarding connection"
            );
            self.discard().await;
        }
    }

    fn spawn_keepalive(self: &Arc<Self>) {
        let Ok(handle) = tokio::runtime::Handle::try_current() else {
            return;
        };
        let weak: Weak<Self> = Arc::downgrade(self);
        handle.spawn(async move {
            let mut ticker = tokio::time::interval(KEEPALIVE_INTERVAL);
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            loop {
                ticker.tick().await;
                let Some(slot) = weak.upgrade() else {
                    break;
                };
                slot.keepalive().await;
            }
        });
    }
}

fn unix_now_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;

    /// Regression guard: a long-lived Redis handle must never be cached in an
    /// unresetable `OnceCell` again. That pattern is what turned one stale
    /// socket into a gateway-wide AI outage; every store must use
    /// [`RedisConnectionSlot`] so the handle can be discarded and reopened.
    #[test]
    fn legacy_once_cell_connection_cache_is_forbidden() {
        // Assemble the needle at runtime so this test's own source does not
        // match it.
        let needle = ["OnceCell<", "ConnectionManager"].concat();
        let mut hits = Vec::new();
        let src = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
        collect_hits(&src, &needle, &mut hits);
        assert!(
            hits.is_empty(),
            "cache Redis connections through RedisConnectionSlot, not OnceCell: {hits:?}"
        );
    }

    fn collect_hits(dir: &Path, needle: &str, hits: &mut Vec<String>) {
        let Ok(entries) = std::fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_hits(&path, needle, hits);
                continue;
            }
            if path.extension().is_some_and(|ext| ext == "rs") {
                let Ok(text) = std::fs::read_to_string(&path) else {
                    continue;
                };
                for (line_number, line) in text.lines().enumerate() {
                    let code = line.trim_start();
                    if code.starts_with("//") {
                        continue;
                    }
                    if line.contains(needle) {
                        hits.push(format!("{}:{}", path.display(), line_number + 1));
                    }
                }
            }
        }
    }

    /// Regression for the production incident: after the cached connection is
    /// killed, the slot must still be able to produce a live connection (via
    /// probe-discard-reopen or the driver's own reconnect), never a permanently
    /// dead handle.
    ///
    /// Runs only when `SDKWORK_TEST_REDIS_URL` points at a disposable Redis.
    #[tokio::test]
    async fn slot_recovers_after_the_cached_connection_is_killed() {
        let Ok(url) = std::env::var("SDKWORK_TEST_REDIS_URL") else {
            eprintln!("skipping: SDKWORK_TEST_REDIS_URL is not set");
            return;
        };
        let client = redis::Client::open(url.as_str()).expect("open slot client");
        let slot = RedisConnectionSlot::new(client, Duration::from_secs(2));
        let mut conn = slot.get().await.expect("prime connection");
        let connection_id: i64 = redis::cmd("CLIENT")
            .arg("ID")
            .query_async(&mut conn)
            .await
            .expect("read client id");
        drop(conn);

        let admin_client = redis::Client::open(url.as_str()).expect("open admin client");
        let mut admin = admin_client
            .get_multiplexed_async_connection()
            .await
            .expect("admin connection");
        let killed: i64 = redis::cmd("CLIENT")
            .arg("KILL")
            .arg("ID")
            .arg(connection_id)
            .query_async(&mut admin)
            .await
            .expect("kill cached connection");
        assert_eq!(1, killed, "cached connection must have been killed");

        // Either the manager detected the failure or the keepalive/discard path
        // will; both must end with a usable connection.
        let _ = slot.probe().await;
        slot.discard().await;
        let mut fresh = slot.get().await.expect("fresh connection");
        let pong: String = redis::cmd("PING")
            .query_async(&mut fresh)
            .await
            .expect("PING on fresh connection");
        assert_eq!("PONG", pong);
    }
}
