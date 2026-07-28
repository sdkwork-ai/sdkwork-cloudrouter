use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use redis::aio::ConnectionManager;
use redis::streams::{StreamAutoClaimOptions, StreamReadOptions, StreamReadReply};
use redis::{AsyncCommands, Script};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    now_epoch_millis, GatewayAccountingRetryDelivery, GatewayAccountingRetryEnvelope,
    GatewayAccountingRetryQueue, GatewayAccountingRetryQueueFuture,
};

const STREAM_SUFFIX: &str = "gateway-accounting-retry:stream";
const GROUP_SUFFIX: &str = "gateway-accounting-retry:group";
const DLQ_SUFFIX: &str = "gateway-accounting-retry:dlq";
const DEDUPE_SUFFIX: &str = "gateway-accounting-retry:dedupe";
const SCHEDULE_SUFFIX: &str = "gateway-accounting-retry:schedule";
const PAYLOAD_SUFFIX: &str = "gateway-accounting-retry:payload";
const MAX_CLAIM_BATCH_SIZE: usize = 200;

fn redis_hash_tag(value: &str) -> Option<&str> {
    let open = value.find('{')?;
    let remainder = &value[open + 1..];
    let close = remainder.find('}')?;
    (close > 0).then_some(&remainder[..close])
}

fn redis_queue_key_prefix(prefix: &str) -> String {
    if redis_hash_tag(prefix).is_some() {
        return prefix.to_owned();
    }
    if !prefix.contains(['{', '}']) {
        return format!("{{{prefix}}}");
    }

    // An empty or malformed tag would shadow any tag appended after it under
    // Redis Cluster's first-brace rule, so put a stable tag before the prefix.
    format!("{{clawrouter-gateway-accounting-retry}}:{prefix}")
}

fn queue_error(context: &str, error: impl std::fmt::Display) -> DomainError {
    DomainError::new(format!("{context}: {error}"))
}

fn bounded_claim_batch_size(batch_size: usize) -> usize {
    batch_size.min(MAX_CLAIM_BATCH_SIZE)
}

fn delivery_lease_lost_error(operation: &str) -> DomainError {
    DomainError::new(format!(
        "gateway accounting retry {operation} failed because the delivery lease is no longer owned or its terminal state is unknown"
    ))
}

fn require_single_delivery_mutation(operation: &str, rows_affected: u64) -> DomainResult<()> {
    if rows_affected == 1 {
        return Ok(());
    }
    Err(delivery_lease_lost_error(operation))
}

fn serialize_envelope(envelope: &GatewayAccountingRetryEnvelope) -> DomainResult<String> {
    serde_json::to_string(envelope).map_err(|error| {
        queue_error(
            "gateway accounting retry envelope serialization failed",
            error,
        )
    })
}

fn deserialize_envelope(value: &str) -> DomainResult<GatewayAccountingRetryEnvelope> {
    serde_json::from_str(value)
        .map_err(|error| queue_error("gateway accounting retry envelope is invalid", error))
}

fn deserialize_and_validate_envelope(value: &str) -> DomainResult<GatewayAccountingRetryEnvelope> {
    let envelope = deserialize_envelope(value)?;
    envelope.validate()?;
    Ok(envelope)
}

#[derive(Clone)]
pub struct RedisGatewayAccountingRetryQueue {
    client: redis::Client,
    connection_manager: Arc<tokio::sync::OnceCell<ConnectionManager>>,
    reclaim_cursor: Arc<tokio::sync::Mutex<String>>,
    stream: String,
    group: String,
    dlq: String,
    schedule: String,
    payloads: String,
    dedupe_hash: String,
}

impl RedisGatewayAccountingRetryQueue {
    pub fn new(redis_url: &str, key_prefix: &str) -> DomainResult<Self> {
        let client = redis::Client::open(redis_url)
            .map_err(|error| queue_error("gateway accounting retry Redis URL is invalid", error))?;
        let prefix = key_prefix.trim().trim_end_matches(':');
        let prefix = if prefix.is_empty() {
            "clawrouter"
        } else {
            prefix
        };
        let key_prefix = redis_queue_key_prefix(prefix);
        Ok(Self {
            client,
            connection_manager: Arc::new(tokio::sync::OnceCell::const_new()),
            reclaim_cursor: Arc::new(tokio::sync::Mutex::new("0-0".to_owned())),
            stream: format!("{key_prefix}:{STREAM_SUFFIX}"),
            group: format!("{prefix}:{GROUP_SUFFIX}"),
            dlq: format!("{key_prefix}:{DLQ_SUFFIX}"),
            schedule: format!("{key_prefix}:{SCHEDULE_SUFFIX}"),
            payloads: format!("{key_prefix}:{PAYLOAD_SUFFIX}"),
            dedupe_hash: format!("{key_prefix}:{DEDUPE_SUFFIX}"),
        })
    }

    async fn connection(&self) -> DomainResult<ConnectionManager> {
        self.connection_manager
            .get_or_try_init(|| async {
                self.client.get_connection_manager().await.map_err(|error| {
                    queue_error("gateway accounting retry Redis connection failed", error)
                })
            })
            .await
            .cloned()
    }

    async fn ensure_group(&self, connection: &mut ConnectionManager) -> DomainResult<()> {
        match connection
            .xgroup_create_mkstream(&self.stream, &self.group, "0-0")
            .await
        {
            Ok(()) => Ok(()),
            Err(error) if error.to_string().contains("BUSYGROUP") => Ok(()),
            Err(error) => Err(queue_error(
                "gateway accounting retry Redis consumer group creation failed",
                error,
            )),
        }
    }

    async fn promote_due(
        &self,
        connection: &mut ConnectionManager,
        batch_size: usize,
    ) -> DomainResult<()> {
        let script = Script::new(
            r#"
            local due = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[1],
                'LIMIT', 0, ARGV[2])
            for _, event_id in ipairs(due) do
                local payload = redis.call('HGET', KEYS[3], event_id)
                if payload then
                    local existing = redis.call('HGET', KEYS[4], event_id)
                    if existing and existing ~= 'delayed' then
                        local current = redis.call('XRANGE', KEYS[1], existing, existing, 'COUNT', 1)
                        if #current == 0 then
                            existing = false
                        end
                    end
                    if not existing or existing == 'delayed' then
                        local stream_id = redis.call('XADD', KEYS[1], '*',
                            'event_id', event_id, 'envelope', payload)
                        redis.call('HSET', KEYS[4], event_id, stream_id)
                    end
                    redis.call('HDEL', KEYS[3], event_id)
                else
                    redis.call('XADD', KEYS[5], '*', 'event_id', event_id,
                        'envelope', '<missing-delayed-payload>',
                        'failure_code', 'missing_delayed_payload')
                    if redis.call('HGET', KEYS[4], event_id) == 'delayed' then
                        redis.call('HDEL', KEYS[4], event_id)
                    end
                end
                redis.call('ZREM', KEYS[2], event_id)
            end
            return #due
            "#,
        );
        script
            .key(&self.stream)
            .key(&self.schedule)
            .key(&self.payloads)
            .key(&self.dedupe_hash)
            .key(&self.dlq)
            .arg(now_epoch_millis())
            .arg(batch_size.max(1))
            .invoke_async::<i64>(connection)
            .await
            .map_err(|error| {
                queue_error(
                    "gateway accounting retry Redis delayed promotion failed",
                    error,
                )
            })?;
        Ok(())
    }

    async fn defer_stream_entry(
        &self,
        connection: &mut ConnectionManager,
        stream_entry_id: &str,
        consumer_id: &str,
        event_id: &str,
        raw_envelope: &str,
        available_at_epoch_millis: u64,
    ) -> DomainResult<bool> {
        let script = Script::new(
            r#"
            local pending = redis.call('XPENDING', KEYS[1], ARGV[1], ARGV[2], ARGV[2], 1)
            if #pending == 0 or pending[1][2] ~= ARGV[3] then
                return 0
            end
            local entries = redis.call('XRANGE', KEYS[1], ARGV[2], ARGV[2], 'COUNT', 1)
            if #entries ~= 1 then
                return 0
            end
            local stored_event_id = ''
            local fields = entries[1][2]
            for index = 1, #fields, 2 do
                if fields[index] == 'event_id' then
                    stored_event_id = fields[index + 1]
                    break
                end
            end
            if stored_event_id ~= ARGV[4] then
                return -1
            end
            redis.call('HSET', KEYS[3], ARGV[4], ARGV[5])
            redis.call('ZADD', KEYS[2], ARGV[6], ARGV[4])
            redis.call('HSET', KEYS[4], ARGV[4], 'delayed')
            redis.call('XACK', KEYS[1], ARGV[1], ARGV[2])
            redis.call('XDEL', KEYS[1], ARGV[2])
            return 1
            "#,
        );
        let result = script
            .key(&self.stream)
            .key(&self.schedule)
            .key(&self.payloads)
            .key(&self.dedupe_hash)
            .arg(&self.group)
            .arg(stream_entry_id)
            .arg(consumer_id)
            .arg(event_id)
            .arg(raw_envelope)
            .arg(available_at_epoch_millis)
            .invoke_async::<i64>(connection)
            .await
            .map_err(|error| {
                queue_error(
                    "gateway accounting retry Redis delayed deferral failed",
                    error,
                )
            })?;
        if result == -1 {
            return Err(DomainError::new(
                "gateway accounting retry Redis stream event_id mismatch during deferral",
            ));
        }
        Ok(result == 1)
    }

    async fn read_claimed(
        &self,
        connection: &mut ConnectionManager,
        claimed: Vec<redis::streams::StreamId>,
        consumer_id: &str,
    ) -> DomainResult<Vec<GatewayAccountingRetryDelivery>> {
        let mut deliveries = Vec::with_capacity(claimed.len());
        for entry in claimed {
            let stream_event_id = entry
                .map
                .get("event_id")
                .and_then(|value| redis::from_redis_value::<String>(value.clone()).ok())
                .unwrap_or_else(|| "unknown".to_owned());
            let raw_envelope = entry
                .map
                .get("envelope")
                .and_then(|value| redis::from_redis_value::<String>(value.clone()).ok());
            let envelope = raw_envelope
                .as_deref()
                .ok_or_else(|| {
                    DomainError::new("gateway accounting retry stream entry has no text envelope")
                })
                .and_then(deserialize_and_validate_envelope);
            match envelope {
                Ok(envelope) => {
                    if stream_event_id != envelope.event_id {
                        let error = DomainError::new(
                            "gateway accounting retry stream event_id does not match its envelope",
                        );
                        self.dead_letter_invalid_entry(
                            connection,
                            &entry.id,
                            consumer_id,
                            &stream_event_id,
                            raw_envelope.as_deref().unwrap_or("<invalid-envelope>"),
                            "stream_event_id_mismatch",
                            Some(&envelope.event_id),
                        )
                        .await?;
                        tracing::error!(
                            stream_entry_id = %entry.id,
                            stream_event_id,
                            envelope_event_id = %envelope.event_id,
                            error = %error,
                            "invalid gateway accounting Redis entry moved to the dead-letter queue"
                        );
                    } else if !envelope.is_due(now_epoch_millis()) {
                        let available_at = envelope.available_at_epoch_millis;
                        if let Err(error) = self
                            .defer_stream_entry(
                                connection,
                                &entry.id,
                                consumer_id,
                                &envelope.event_id,
                                raw_envelope.as_deref().unwrap_or_default(),
                                available_at,
                            )
                            .await
                        {
                            return Err(error);
                        }
                    } else {
                        deliveries.push(GatewayAccountingRetryDelivery {
                            delivery_id: encode_redis_delivery_id(&entry.id, consumer_id)?,
                            envelope,
                        });
                    }
                }
                Err(error) => {
                    self.dead_letter_invalid_entry(
                        connection,
                        &entry.id,
                        consumer_id,
                        &stream_event_id,
                        raw_envelope.as_deref().unwrap_or("<invalid-envelope>"),
                        "invalid_envelope",
                        None,
                    )
                    .await?;
                    tracing::error!(
                        stream_entry_id = %entry.id,
                        stream_event_id,
                        error = %error,
                        "invalid gateway accounting Redis entry moved to the dead-letter queue"
                    );
                }
            }
        }
        Ok(deliveries)
    }

    async fn dead_letter_invalid_entry(
        &self,
        connection: &mut ConnectionManager,
        stream_entry_id: &str,
        consumer_id: &str,
        stream_event_id: &str,
        raw_envelope: &str,
        failure_code: &str,
        canonical_event_id: Option<&str>,
    ) -> DomainResult<()> {
        let script = Script::new(
            r#"
            local pending = redis.call('XPENDING', KEYS[1], ARGV[1], ARGV[2], ARGV[2], 1)
            if #pending == 0 or pending[1][2] ~= ARGV[3] then
                return 0
            end
            redis.call('XADD', KEYS[2], '*', 'event_id', ARGV[4], 'envelope', ARGV[5], 'failure_code', ARGV[6])
            redis.call('XACK', KEYS[1], ARGV[1], ARGV[2])
            redis.call('XDEL', KEYS[1], ARGV[2])
            local function clear_retry_state_if_owned(event_id)
                if redis.call('HGET', KEYS[5], event_id) == ARGV[2] then
                    redis.call('ZREM', KEYS[3], event_id)
                    redis.call('HDEL', KEYS[4], event_id)
                    redis.call('HDEL', KEYS[5], event_id)
                end
            end
            clear_retry_state_if_owned(ARGV[4])
            if ARGV[7] ~= '' and ARGV[7] ~= ARGV[4] then
                clear_retry_state_if_owned(ARGV[7])
            end
            return 1
            "#,
        );
        let result = script
            .key(&self.stream)
            .key(&self.dlq)
            .key(&self.schedule)
            .key(&self.payloads)
            .key(&self.dedupe_hash)
            .arg(&self.group)
            .arg(stream_entry_id)
            .arg(consumer_id)
            .arg(stream_event_id)
            .arg(raw_envelope)
            .arg(failure_code)
            .arg(canonical_event_id.unwrap_or_default())
            .invoke_async::<i64>(connection)
            .await
            .map_err(|error| {
                queue_error(
                    "gateway accounting retry Redis invalid envelope DLQ failed",
                    error,
                )
            })?;
        if result == 1 {
            Ok(())
        } else {
            Err(delivery_lease_lost_error("Redis invalid-envelope DLQ move"))
        }
    }
}

fn encode_redis_delivery_id(stream_entry_id: &str, consumer_id: &str) -> DomainResult<String> {
    serde_json::to_string(&(stream_entry_id, consumer_id)).map_err(|error| {
        queue_error(
            "gateway accounting retry Redis delivery token encode failed",
            error,
        )
    })
}

fn decode_redis_delivery_id(delivery_id: &str) -> DomainResult<(String, String)> {
    serde_json::from_str(delivery_id).map_err(|error| {
        queue_error(
            "gateway accounting retry Redis delivery token is invalid",
            error,
        )
    })
}

impl GatewayAccountingRetryQueue for RedisGatewayAccountingRetryQueue {
    fn enqueue<'a>(
        &'a self,
        envelope: GatewayAccountingRetryEnvelope,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async move {
            envelope.validate()?;
            let payload = serialize_envelope(&envelope)?;
            let mut connection = self.connection().await?;
            self.ensure_group(&mut connection).await?;
            let script = Script::new(
                r#"
                if redis.call('HEXISTS', KEYS[2], ARGV[1]) == 1 then
                    return 0
                end
                if tonumber(ARGV[3]) <= tonumber(ARGV[4]) then
                    local id = redis.call('XADD', KEYS[1], '*', 'event_id', ARGV[1], 'envelope', ARGV[2])
                    redis.call('HSET', KEYS[2], ARGV[1], id)
                else
                    redis.call('HSET', KEYS[3], ARGV[1], ARGV[2])
                    redis.call('ZADD', KEYS[4], ARGV[3], ARGV[1])
                    redis.call('HSET', KEYS[2], ARGV[1], 'delayed')
                end
                return 1
                "#,
            );
            script
                .key(&self.stream)
                .key(&self.dedupe_hash)
                .key(&self.payloads)
                .key(&self.schedule)
                .arg(&envelope.event_id)
                .arg(payload)
                .arg(envelope.available_at_epoch_millis)
                .arg(now_epoch_millis())
                .invoke_async::<i64>(&mut connection)
                .await
                .map_err(|error| {
                    queue_error("gateway accounting retry Redis enqueue failed", error)
                })?;
            Ok(())
        })
    }

    fn claim<'a>(
        &'a self,
        consumer_id: &'a str,
        batch_size: usize,
        reclaim_idle: Duration,
        wait_timeout: Duration,
    ) -> GatewayAccountingRetryQueueFuture<'a, Vec<GatewayAccountingRetryDelivery>> {
        Box::pin(async move {
            let batch_size = bounded_claim_batch_size(batch_size);
            if batch_size == 0 {
                return Ok(Vec::new());
            }
            let mut connection = self.connection().await?;
            self.ensure_group(&mut connection).await?;
            let reclaim = {
                let mut cursor = self.reclaim_cursor.lock().await;
                let reclaim: redis::streams::StreamAutoClaimReply = connection
                    .xautoclaim_options(
                        &self.stream,
                        &self.group,
                        consumer_id,
                        reclaim_idle.as_millis().try_into().unwrap_or(usize::MAX),
                        cursor.as_str(),
                        StreamAutoClaimOptions::default().count(batch_size),
                    )
                    .await
                    .map_err(|error| {
                        queue_error("gateway accounting retry Redis reclaim failed", error)
                    })?;
                *cursor = reclaim.next_stream_id.clone();
                reclaim
            };
            let mut deliveries = self
                .read_claimed(&mut connection, reclaim.claimed, consumer_id)
                .await?;
            if deliveries.len() < batch_size {
                self.promote_due(&mut connection, batch_size - deliveries.len())
                    .await?;
                let mut options = StreamReadOptions::default()
                    .group(&self.group, consumer_id)
                    .count(batch_size - deliveries.len());
                if !wait_timeout.is_zero() {
                    options =
                        options.block(wait_timeout.as_millis().try_into().unwrap_or(usize::MAX));
                }
                let reply: Option<StreamReadReply> = connection
                    .xread_options(&[self.stream.as_str()], &[">"], &options)
                    .await
                    .map_err(|error| {
                        queue_error("gateway accounting retry Redis read failed", error)
                    })?;
                if let Some(reply) = reply {
                    for key in reply.keys {
                        deliveries.extend(
                            self.read_claimed(&mut connection, key.ids, consumer_id)
                                .await?,
                        );
                    }
                }
            }
            deliveries.truncate(batch_size);
            Ok(deliveries)
        })
    }

    fn acknowledge<'a>(
        &'a self,
        delivery_id: &'a str,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async move {
            let (stream_entry_id, consumer_id) = decode_redis_delivery_id(delivery_id)?;
            let mut connection = self.connection().await?;
            let script = Script::new(
                r#"
                local pending = redis.call('XPENDING', KEYS[1], ARGV[1], ARGV[2], ARGV[2], 1)
                if #pending == 0 or pending[1][2] ~= ARGV[3] then
                    return 0
                end
                local event_id = ''
                local entries = redis.call('XRANGE', KEYS[1], ARGV[2], ARGV[2], 'COUNT', 1)
                if #entries == 1 then
                    local fields = entries[1][2]
                    for index = 1, #fields, 2 do
                        if fields[index] == 'event_id' then
                            event_id = fields[index + 1]
                            break
                        end
                    end
                end
                local acknowledged = redis.call('XACK', KEYS[1], ARGV[1], ARGV[2])
                if acknowledged == 1 then
                    redis.call('XDEL', KEYS[1], ARGV[2])
                    if event_id ~= '' then
                        redis.call('ZREM', KEYS[2], event_id)
                        redis.call('HDEL', KEYS[3], event_id)
                        redis.call('HDEL', KEYS[4], event_id)
                    end
                end
                return acknowledged
                "#,
            );
            let result = script
                .key(&self.stream)
                .key(&self.schedule)
                .key(&self.payloads)
                .key(&self.dedupe_hash)
                .arg(&self.group)
                .arg(stream_entry_id)
                .arg(consumer_id)
                .invoke_async::<i64>(&mut connection)
                .await
                .map_err(|error| queue_error("gateway accounting retry Redis ACK failed", error))?;
            if result == 1 {
                Ok(())
            } else {
                Err(delivery_lease_lost_error("Redis ACK"))
            }
        })
    }

    fn reschedule<'a>(
        &'a self,
        delivery_id: &'a str,
        envelope: GatewayAccountingRetryEnvelope,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async move {
            envelope.validate()?;
            let (stream_entry_id, consumer_id) = decode_redis_delivery_id(delivery_id)?;
            let payload = serialize_envelope(&envelope)?;
            let mut connection = self.connection().await?;
            let script = Script::new(
                r#"
                local pending = redis.call('XPENDING', KEYS[1], ARGV[1], ARGV[4], ARGV[4], 1)
                if #pending == 0 or pending[1][2] ~= ARGV[5] then
                    return 0
                end
                local entries = redis.call('XRANGE', KEYS[1], ARGV[4], ARGV[4], 'COUNT', 1)
                if #entries ~= 1 then
                    return 0
                end
                local stored_event_id = ''
                local fields = entries[1][2]
                for index = 1, #fields, 2 do
                    if fields[index] == 'event_id' then
                        stored_event_id = fields[index + 1]
                        break
                    end
                end
                if stored_event_id ~= ARGV[2] then
                    return -1
                end
                if tonumber(ARGV[6]) > tonumber(ARGV[7]) then
                    redis.call('HSET', KEYS[3], ARGV[2], ARGV[3])
                    redis.call('ZADD', KEYS[2], ARGV[6], ARGV[2])
                    redis.call('HSET', KEYS[4], ARGV[2], 'delayed')
                else
                    local id = redis.call('XADD', KEYS[1], '*', 'event_id', ARGV[2], 'envelope', ARGV[3])
                    redis.call('HSET', KEYS[4], ARGV[2], id)
                end
                redis.call('XACK', KEYS[1], ARGV[1], ARGV[4])
                redis.call('XDEL', KEYS[1], ARGV[4])
                if tonumber(ARGV[6]) <= tonumber(ARGV[7]) then
                    redis.call('ZREM', KEYS[2], ARGV[2])
                    redis.call('HDEL', KEYS[3], ARGV[2])
                end
                return 1
                "#,
            );
            let result = script
                .key(&self.stream)
                .key(&self.schedule)
                .key(&self.payloads)
                .key(&self.dedupe_hash)
                .arg(&self.group)
                .arg(&envelope.event_id)
                .arg(payload)
                .arg(stream_entry_id)
                .arg(consumer_id)
                .arg(envelope.available_at_epoch_millis)
                .arg(now_epoch_millis())
                .invoke_async::<i64>(&mut connection)
                .await
                .map_err(|error| {
                    queue_error("gateway accounting retry Redis reschedule failed", error)
                })?;
            match result {
                1 => Ok(()),
                -1 => Err(DomainError::new(
                    "gateway accounting retry Redis stream event_id mismatch during reschedule",
                )),
                _ => Err(delivery_lease_lost_error("Redis reschedule")),
            }
        })
    }

    fn dead_letter<'a>(
        &'a self,
        delivery_id: &'a str,
        envelope: GatewayAccountingRetryEnvelope,
        failure_code: &'a str,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async move {
            let (stream_entry_id, consumer_id) = decode_redis_delivery_id(delivery_id)?;
            let payload = serialize_envelope(&envelope)?;
            let mut connection = self.connection().await?;
            let script = Script::new(
                r#"
                local pending = redis.call('XPENDING', KEYS[1], ARGV[1], ARGV[5], ARGV[5], 1)
                if #pending == 0 or pending[1][2] ~= ARGV[6] then
                    return 0
                end
                local entries = redis.call('XRANGE', KEYS[1], ARGV[5], ARGV[5], 'COUNT', 1)
                if #entries ~= 1 then
                    return 0
                end
                local stored_event_id = ''
                local fields = entries[1][2]
                for index = 1, #fields, 2 do
                    if fields[index] == 'event_id' then
                        stored_event_id = fields[index + 1]
                        break
                    end
                end
                if stored_event_id ~= ARGV[2] then
                    return -1
                end
                redis.call('XADD', KEYS[2], '*', 'event_id', ARGV[2], 'envelope', ARGV[3], 'failure_code', ARGV[4])
                redis.call('XACK', KEYS[1], ARGV[1], ARGV[5])
                redis.call('XDEL', KEYS[1], ARGV[5])
                redis.call('ZREM', KEYS[3], ARGV[2])
                redis.call('HDEL', KEYS[4], ARGV[2])
                redis.call('HDEL', KEYS[5], ARGV[2])
                return 1
                "#,
            );
            let result = script
                .key(&self.stream)
                .key(&self.dlq)
                .key(&self.schedule)
                .key(&self.payloads)
                .key(&self.dedupe_hash)
                .arg(&self.group)
                .arg(&envelope.event_id)
                .arg(payload)
                .arg(failure_code)
                .arg(stream_entry_id)
                .arg(consumer_id)
                .invoke_async::<i64>(&mut connection)
                .await
                .map_err(|error| queue_error("gateway accounting retry Redis DLQ failed", error))?;
            match result {
                1 => Ok(()),
                -1 => Err(DomainError::new(
                    "gateway accounting retry Redis stream event_id mismatch during DLQ move",
                )),
                _ => Err(delivery_lease_lost_error("Redis DLQ move")),
            }
        })
    }

    fn dead_letter_depth<'a>(&'a self) -> GatewayAccountingRetryQueueFuture<'a, u64> {
        Box::pin(async move {
            let mut connection = self.connection().await?;
            connection.xlen(&self.dlq).await.map_err(|error| {
                queue_error("gateway accounting retry Redis DLQ depth failed", error)
            })
        })
    }
}

#[derive(Default, Clone)]
pub struct InMemoryGatewayAccountingRetryQueue {
    entries: Arc<tokio::sync::Mutex<Vec<GatewayAccountingRetryEnvelope>>>,
    dead_letter_count: Arc<AtomicU64>,
}

impl GatewayAccountingRetryQueue for InMemoryGatewayAccountingRetryQueue {
    fn enqueue<'a>(
        &'a self,
        envelope: GatewayAccountingRetryEnvelope,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async move {
            let mut entries = self.entries.lock().await;
            if !entries
                .iter()
                .any(|item| item.event_id == envelope.event_id)
            {
                entries.push(envelope);
            }
            Ok(())
        })
    }

    fn claim<'a>(
        &'a self,
        _consumer_id: &'a str,
        batch_size: usize,
        _reclaim_idle: Duration,
        _wait_timeout: Duration,
    ) -> GatewayAccountingRetryQueueFuture<'a, Vec<GatewayAccountingRetryDelivery>> {
        Box::pin(async move {
            let mut entries = self.entries.lock().await;
            let take = bounded_claim_batch_size(batch_size).min(entries.len());
            let claimed: Vec<_> = entries.drain(..take).collect();
            Ok(claimed
                .into_iter()
                .map(|envelope| GatewayAccountingRetryDelivery {
                    delivery_id: envelope.delivery_id(),
                    envelope,
                })
                .collect())
        })
    }

    fn acknowledge<'a>(
        &'a self,
        _delivery_id: &'a str,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }

    fn reschedule<'a>(
        &'a self,
        _delivery_id: &'a str,
        envelope: GatewayAccountingRetryEnvelope,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        self.enqueue(envelope)
    }

    fn dead_letter<'a>(
        &'a self,
        _delivery_id: &'a str,
        _envelope: GatewayAccountingRetryEnvelope,
        _failure_code: &'a str,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async move {
            self.dead_letter_count.fetch_add(1, Ordering::Relaxed);
            Ok(())
        })
    }

    fn dead_letter_depth<'a>(&'a self) -> GatewayAccountingRetryQueueFuture<'a, u64> {
        Box::pin(async move { Ok(self.dead_letter_count.load(Ordering::Relaxed)) })
    }
}

#[cfg(test)]
mod tests {

    use super::*;
    use crate::ports::GatewayRequestTraceCommand;

    fn trace_envelope(request_id: &str) -> GatewayAccountingRetryEnvelope {
        let command = GatewayRequestTraceCommand {
            request_id: request_id.to_owned(),
            trace_id: Some(format!("trace-{request_id}")),
            tenant_id: 100_001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 101,
            api_key_name_snapshot: "Accounting Retry Test Key".to_owned(),
            account_group_id: 10,
            upstream_account_group_snapshot: "standard".to_owned(),
            catalog_key: "openai/gpt-4o-mini".to_owned(),
            requested_model: "gpt-4o-mini".to_owned(),
            requested_model_catalog_key: "openai/gpt-4o-mini".to_owned(),
            supplier_code: "openrouter".to_owned(),
            account_id: 3_001,
            provider_model: "gpt-4o-mini-upstream".to_owned(),
            provider_native_model: "gpt-4o-mini-upstream".to_owned(),
            region_code: "global".to_owned(),
            request_path: "/v1/chat/completions".to_owned(),
            http_method: "POST".to_owned(),
            user_agent: Some("sdkwork-accounting-retry-test".to_owned()),
            http_status: Some(200),
            streaming: false,
            prompt_tokens: 3,
            completion_tokens: 2,
            cached_tokens: 0,
            total_tokens: 5,
            latency_ms: Some(42),
            ttft_ms: Some(10),
            provider_error_code: None,
            error_type: None,
            error_message_masked: None,
        };
        let mut envelope =
            GatewayAccountingRetryEnvelope::from_trace(command).expect("valid trace envelope");
        envelope.available_at_epoch_millis = 0;
        envelope
    }

    #[test]
    fn redis_queue_keys_share_a_cluster_hash_tag_and_preserve_tagged_prefixes() {
        let queue = RedisGatewayAccountingRetryQueue::new(
            "redis://127.0.0.1:6379/0",
            "  clawrouter-production:::  ",
        )
        .expect("construct Redis retry queue");
        assert_eq!(Some("clawrouter-production"), redis_hash_tag(&queue.stream));
        assert_eq!(redis_hash_tag(&queue.stream), redis_hash_tag(&queue.dlq));
        assert_eq!(
            redis_hash_tag(&queue.stream),
            redis_hash_tag(&queue.schedule)
        );
        assert_eq!(
            redis_hash_tag(&queue.stream),
            redis_hash_tag(&queue.payloads)
        );
        assert_eq!(
            redis_hash_tag(&queue.stream),
            redis_hash_tag(&queue.dedupe_hash)
        );
        assert_eq!(
            "{clawrouter-production}:gateway-accounting-retry:stream",
            queue.stream
        );

        let tagged = RedisGatewayAccountingRetryQueue::new(
            "redis://127.0.0.1:6379/0",
            "clawrouter:{tenant-a}::",
        )
        .expect("construct pre-tagged Redis retry queue");
        assert_eq!(
            "clawrouter:{tenant-a}:gateway-accounting-retry:stream",
            tagged.stream
        );
        assert_eq!(Some("tenant-a"), redis_hash_tag(&tagged.stream));

        let malformed = RedisGatewayAccountingRetryQueue::new(
            "redis://127.0.0.1:6379/0",
            "clawrouter:{}:tenant-a",
        )
        .expect("construct Redis retry queue with an empty tag");
        assert_eq!(
            Some("clawrouter-gateway-accounting-retry"),
            redis_hash_tag(&malformed.stream)
        );
        assert_eq!(
            redis_hash_tag(&malformed.stream),
            redis_hash_tag(&malformed.dlq)
        );
    }

    #[test]
    fn retry_envelope_decoder_rejects_parseable_event_id_tampering() {
        let mut envelope = trace_envelope("req-event-id-tampering");
        envelope.event_id = format!("acct:v1:{}", "0".repeat(64));
        let payload = serialize_envelope(&envelope).expect("serialize tampered envelope");

        let error = deserialize_and_validate_envelope(&payload)
            .expect_err("event id tampering must fail validation");
        assert!(error
            .to_string()
            .contains("event_id does not match the payload"));
    }

    #[test]
    fn retry_claim_batch_size_is_bounded_at_the_adapter_boundary() {
        assert_eq!(0, bounded_claim_batch_size(0));
        assert_eq!(1, bounded_claim_batch_size(1));
        assert_eq!(MAX_CLAIM_BATCH_SIZE, bounded_claim_batch_size(201));
        assert_eq!(MAX_CLAIM_BATCH_SIZE, bounded_claim_batch_size(usize::MAX));
    }

    #[tokio::test]
    async fn redis_queue_fences_stale_consumers_and_dead_letters_poison_when_configured() {
        let Ok(redis_url) = std::env::var("SDKWORK_TEST_REDIS_URL") else {
            return;
        };
        let mut nonce = [0_u8; 8];
        getrandom::fill(&mut nonce).expect("Redis test prefix entropy");
        let prefix = format!(
            "clawrouter-test:{}:{}",
            std::process::id(),
            hex::encode(nonce)
        );
        let queue = RedisGatewayAccountingRetryQueue::new(&redis_url, &prefix)
            .expect("create Redis retry queue");
        let envelope = trace_envelope("req-redis-fencing");
        queue
            .enqueue(envelope.clone())
            .await
            .expect("enqueue Redis retry event");

        let first = queue
            .claim("consumer-a", 1, Duration::ZERO, Duration::ZERO)
            .await
            .expect("first Redis claim")
            .pop()
            .expect("first Redis delivery");
        let second = queue
            .claim("consumer-b", 1, Duration::ZERO, Duration::ZERO)
            .await
            .expect("reclaimed Redis claim")
            .pop()
            .expect("reclaimed Redis delivery");
        assert_ne!(first.delivery_id, second.delivery_id);

        let error = queue
            .acknowledge(&first.delivery_id)
            .await
            .expect_err("stale Redis ACK must not claim a successful mutation");
        assert!(error.to_string().contains("lease"));
        let mut connection = queue.connection().await.expect("Redis test connection");
        let stream_length: i64 = redis::cmd("XLEN")
            .arg(&queue.stream)
            .query_async(&mut connection)
            .await
            .expect("read Redis stream length after stale ACK");
        assert_eq!(1, stream_length);
        queue
            .acknowledge(&second.delivery_id)
            .await
            .expect("active Redis ACK");

        let mut delayed = trace_envelope("req-redis-delayed");
        delayed.available_at_epoch_millis = now_epoch_millis().saturating_add(250);
        queue
            .enqueue(delayed.clone())
            .await
            .expect("enqueue delayed Redis retry event");
        queue
            .enqueue(delayed.clone())
            .await
            .expect("duplicate delayed enqueue is idempotent");
        let before_due = queue
            .claim("consumer-delayed-a", 1, Duration::ZERO, Duration::ZERO)
            .await
            .expect("poll delayed Redis retry event before due");
        assert!(before_due.is_empty());
        let delayed_stream_length: i64 = redis::cmd("XLEN")
            .arg(&queue.stream)
            .query_async(&mut connection)
            .await
            .expect("read delayed Redis stream length before due");
        let scheduled_count: i64 = redis::cmd("ZCARD")
            .arg(&queue.schedule)
            .query_async(&mut connection)
            .await
            .expect("read Redis delayed schedule depth");
        let payload_count: i64 = redis::cmd("HLEN")
            .arg(&queue.payloads)
            .query_async(&mut connection)
            .await
            .expect("read Redis delayed payload depth");
        assert_eq!(0, delayed_stream_length);
        assert_eq!(1, scheduled_count);
        assert_eq!(1, payload_count);

        let reopened = RedisGatewayAccountingRetryQueue::new(&redis_url, &prefix)
            .expect("reopen Redis retry queue");
        tokio::time::sleep(Duration::from_millis(300)).await;
        let delayed_delivery = reopened
            .claim(
                "consumer-delayed-after-restart",
                1,
                Duration::ZERO,
                Duration::ZERO,
            )
            .await
            .expect("claim Redis retry event after due")
            .pop()
            .expect("promoted Redis delayed delivery");
        assert_eq!(delayed, delayed_delivery.envelope);

        let next = delayed_delivery
            .envelope
            .next_attempt(now_epoch_millis(), Duration::from_millis(250))
            .expect("build delayed Redis retry attempt");
        reopened
            .reschedule(&delayed_delivery.delivery_id, next.clone())
            .await
            .expect("reschedule Redis retry through delayed storage");
        for consumer in ["consumer-delayed-b", "consumer-delayed-c"] {
            let not_due = reopened
                .claim(consumer, 1, Duration::ZERO, Duration::ZERO)
                .await
                .expect("poll rescheduled Redis retry before due");
            assert!(not_due.is_empty());
            let stream_length: i64 = redis::cmd("XLEN")
                .arg(&reopened.stream)
                .query_async(&mut connection)
                .await
                .expect("read rescheduled Redis stream length before due");
            assert_eq!(
                0, stream_length,
                "not-due envelopes must stay out of the active stream"
            );
        }
        tokio::time::sleep(Duration::from_millis(300)).await;
        let replayed = reopened
            .claim("consumer-delayed-due", 1, Duration::ZERO, Duration::ZERO)
            .await
            .expect("claim rescheduled Redis retry after due")
            .pop()
            .expect("promoted rescheduled Redis delivery");
        assert_eq!(next, replayed.envelope);
        reopened
            .acknowledge(&replayed.delivery_id)
            .await
            .expect("ACK delayed Redis retry test entry");
        let scheduled_after_ack: i64 = redis::cmd("ZCARD")
            .arg(&queue.schedule)
            .query_async(&mut connection)
            .await
            .expect("read Redis delayed schedule after ACK");
        let payloads_after_ack: i64 = redis::cmd("HLEN")
            .arg(&queue.payloads)
            .query_async(&mut connection)
            .await
            .expect("read Redis delayed payloads after ACK");
        let dedupe_after_ack: i64 = redis::cmd("HLEN")
            .arg(&queue.dedupe_hash)
            .query_async(&mut connection)
            .await
            .expect("read Redis dedupe state after ACK");
        assert_eq!(0, scheduled_after_ack);
        assert_eq!(0, payloads_after_ack);
        assert_eq!(0, dedupe_after_ack);

        let cursor_queue = RedisGatewayAccountingRetryQueue::new(&redis_url, &prefix)
            .expect("create Redis retry queue for reclaim cursor coverage");
        let mut stale_tail_envelope = None;
        for index in 0..25 {
            let envelope = trace_envelope(&format!("req-redis-reclaim-cursor-{index}"));
            if index == 24 {
                stale_tail_envelope = Some(envelope.clone());
            }
            cursor_queue
                .enqueue(envelope)
                .await
                .expect("enqueue Redis reclaim cursor event");
        }
        let initial_cursor_claims = cursor_queue
            .claim("consumer-cursor-origin", 25, Duration::ZERO, Duration::ZERO)
            .await
            .expect("claim Redis reclaim cursor events");
        assert_eq!(25, initial_cursor_claims.len());
        let mut cursor_stream_ids = initial_cursor_claims
            .iter()
            .map(|delivery| {
                decode_redis_delivery_id(&delivery.delivery_id)
                    .map(|(stream_id, _)| stream_id)
                    .expect("decode Redis reclaim cursor delivery id")
            })
            .collect::<Vec<_>>();
        let stale_tail_stream_id = cursor_stream_ids
            .pop()
            .expect("last Redis reclaim cursor stream entry");

        let mut refresh_pending_entries = redis::cmd("XCLAIM");
        refresh_pending_entries
            .arg(&cursor_queue.stream)
            .arg(&cursor_queue.group)
            .arg("consumer-cursor-fresh")
            .arg(0);
        for stream_id in &cursor_stream_ids {
            refresh_pending_entries.arg(stream_id);
        }
        refresh_pending_entries.arg("IDLE").arg(0);
        let _: redis::Value = refresh_pending_entries
            .query_async(&mut connection)
            .await
            .expect("refresh leading Redis pending entries");
        let _: redis::Value = redis::cmd("XCLAIM")
            .arg(&cursor_queue.stream)
            .arg(&cursor_queue.group)
            .arg("consumer-cursor-stale")
            .arg(0)
            .arg(&stale_tail_stream_id)
            .arg("IDLE")
            .arg(600_000)
            .query_async(&mut connection)
            .await
            .expect("age trailing Redis pending entry");

        let mut reclaimed_tail = None;
        for _ in 0..=cursor_stream_ids.len() {
            let deliveries = cursor_queue
                .claim(
                    "consumer-cursor-reclaimer",
                    1,
                    Duration::from_secs(300),
                    Duration::ZERO,
                )
                .await
                .expect("scan Redis pending entries with reclaim cursor");
            if let Some(delivery) = deliveries.into_iter().next() {
                reclaimed_tail = Some(delivery);
                break;
            }
        }
        let reclaimed_tail = reclaimed_tail.expect("reclaim cursor must reach stale tail entry");
        assert_eq!(
            stale_tail_envelope
                .as_ref()
                .expect("stale tail envelope")
                .event_id
                .as_str(),
            reclaimed_tail.envelope.event_id.as_str()
        );
        cursor_queue
            .acknowledge(&reclaimed_tail.delivery_id)
            .await
            .expect("acknowledge reclaimed Redis tail entry");
        for stream_entry_id in cursor_stream_ids {
            let fresh_delivery_id =
                encode_redis_delivery_id(&stream_entry_id, "consumer-cursor-fresh")
                    .expect("encode Redis reclaim cursor cleanup delivery id");
            cursor_queue
                .acknowledge(&fresh_delivery_id)
                .await
                .expect("acknowledge refreshed Redis pending entry");
        }

        let _: String = redis::cmd("XADD")
            .arg(&queue.stream)
            .arg("*")
            .arg("event_id")
            .arg("poison-event")
            .arg("envelope")
            .arg("{broken-json")
            .query_async(&mut connection)
            .await
            .expect("insert poison Redis event");
        let poison = queue
            .claim("consumer-poison", 1, Duration::ZERO, Duration::ZERO)
            .await
            .expect("claim poison Redis event");
        assert!(poison.is_empty());
        let active_length: i64 = redis::cmd("XLEN")
            .arg(&queue.stream)
            .query_async(&mut connection)
            .await
            .expect("read Redis active stream length");
        let dlq_length: i64 = redis::cmd("XLEN")
            .arg(&queue.dlq)
            .query_async(&mut connection)
            .await
            .expect("read Redis DLQ length");
        assert_eq!(0, active_length);
        assert_eq!(1, dlq_length);

        let parseable_tampered = trace_envelope("req-redis-parseable-tampered");
        let parseable_tampered_payload =
            serialize_envelope(&parseable_tampered).expect("serialize tampered Redis envelope");
        let parseable_tampered_stream_id: String = redis::cmd("XADD")
            .arg(&queue.stream)
            .arg("*")
            .arg("event_id")
            .arg("tampered-stream-event-id")
            .arg("envelope")
            .arg(parseable_tampered_payload)
            .query_async(&mut connection)
            .await
            .expect("insert parseable tampered Redis event");
        let _: i64 = redis::cmd("HSET")
            .arg(&queue.dedupe_hash)
            .arg(&parseable_tampered.event_id)
            .arg(&parseable_tampered_stream_id)
            .query_async(&mut connection)
            .await
            .expect("seed canonical dedupe mapping for tampered Redis event");
        let parseable_tampered_delivery = queue
            .claim(
                "consumer-parseable-poison",
                1,
                Duration::ZERO,
                Duration::ZERO,
            )
            .await
            .expect("claim parseable tampered Redis event");
        assert!(parseable_tampered_delivery.is_empty());
        let active_length: i64 = redis::cmd("XLEN")
            .arg(&queue.stream)
            .query_async(&mut connection)
            .await
            .expect("read Redis active stream length after parseable tampering");
        let dlq_length: i64 = redis::cmd("XLEN")
            .arg(&queue.dlq)
            .query_async(&mut connection)
            .await
            .expect("read Redis DLQ length after parseable tampering");
        assert_eq!(0, active_length);
        assert_eq!(2, dlq_length);
        let canonical_dedupe_exists: bool = redis::cmd("HEXISTS")
            .arg(&queue.dedupe_hash)
            .arg(&parseable_tampered.event_id)
            .query_async(&mut connection)
            .await
            .expect("read canonical dedupe mapping after tampered Redis event");
        assert!(
            !canonical_dedupe_exists,
            "a rejected stream/event mismatch must not leave its canonical event deduplicated"
        );

        let _: i64 = redis::cmd("DEL")
            .arg(&queue.stream)
            .arg(&queue.dlq)
            .arg(&queue.schedule)
            .arg(&queue.payloads)
            .arg(&queue.dedupe_hash)
            .query_async(&mut connection)
            .await
            .expect("clean Redis retry test keys");
    }
}
