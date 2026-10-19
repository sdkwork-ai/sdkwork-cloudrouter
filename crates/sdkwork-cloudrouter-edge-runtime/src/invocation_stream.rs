use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::body::{Body, Bytes};
use futures_util::stream::{self, BoxStream};
use futures_util::StreamExt;
use sdkwork_cloudrouter_router_service::application::{
    DeferredStreamInvocation, InvocationCancellationSignal, StreamTerminalOutcome,
    StreamingUsageAccumulator, StreamingUsageFormat,
};
use tokio::sync::{mpsc, oneshot};
use tokio::time::{timeout_at, Instant as TokioInstant};

/// Ceiling for one established provider stream (30 minutes).
///
/// Long agent/coding completions legitimately stream for minutes; the prior
/// 120-second total truncated healthy streams with
/// `provider stream total deadline exceeded`. Stream health is still enforced
/// per-frame by `DEFAULT_STREAM_FIRST_FRAME_TIMEOUT` and
/// `DEFAULT_STREAM_IDLE_TIMEOUT`, so a stalled upstream is cut within seconds
/// regardless of this ceiling.
pub(crate) const DEFAULT_STREAM_TOTAL_TIMEOUT: Duration = Duration::from_secs(1800);
const DEFAULT_STREAM_FIRST_FRAME_TIMEOUT: Duration = Duration::from_secs(30);
const DEFAULT_STREAM_IDLE_TIMEOUT: Duration = Duration::from_secs(30);

/// Time limits applied to an already-established provider stream. The total
/// deadline is intentionally separate from the upstream response-header
/// timeout enforced by the dispatcher.
#[derive(Debug, Clone, Copy)]
pub(crate) struct InvocationStreamTimeouts {
    total: Duration,
    first_frame: Duration,
    idle: Duration,
}

impl InvocationStreamTimeouts {
    /// Uses the selected account timeout when one is configured, otherwise the
    /// typed relay runtime default. This keeps account-specific SLAs explicit
    /// while ensuring the global stream timeout is not silently ignored.
    pub(crate) fn from_account_timeout(
        account_timeout: Option<Duration>,
        default_total: Duration,
    ) -> Self {
        let total = account_timeout
            .filter(|timeout| !timeout.is_zero())
            .unwrap_or(default_total)
            .max(Duration::from_millis(1));
        Self {
            total,
            first_frame: DEFAULT_STREAM_FIRST_FRAME_TIMEOUT.min(total),
            idle: DEFAULT_STREAM_IDLE_TIMEOUT.min(total),
        }
    }
}

/// Wraps one provider response body without buffering it. The producer reads
/// exactly one upstream data frame only after the downstream HTTP body asks
/// for one. A separate total-deadline wait remains active while the client is
/// stalled, so a connected-but-non-reading client cannot retain an upstream
/// stream and distributed idempotency lock forever.
pub(crate) fn wrap_invocation_stream(
    body: Body,
    content_type: Option<&str>,
    deferred: DeferredStreamInvocation,
    timeouts: InvocationStreamTimeouts,
    suppress_usage_only_events: bool,
) -> Body {
    let cancellation_signal = deferred.cancellation_signal();
    let (completion, mut terminal_receiver) = StreamCompletion::new();
    tokio::spawn(async move {
        let outcome = terminal_receiver
            .recv()
            .await
            .unwrap_or(StreamTerminalOutcome::Cancelled {
                ttft_ms: None,
                partial_usage: None,
            });
        if let Err(error) = deferred.complete(outcome).await {
            tracing::warn!(error_kind = ?error.kind, "stream terminal lifecycle failed");
        }
    });

    let (demand_sender, demand_receiver) = mpsc::channel(1);
    let usage_format = streaming_usage_format(content_type);
    let producer_completion = completion.clone();
    tokio::spawn(async move {
        run_stream_producer(
            body,
            usage_format,
            timeouts,
            demand_receiver,
            producer_completion,
            cancellation_signal,
            suppress_usage_only_events,
        )
        .await;
    });

    let state = DownstreamStreamState {
        demand_sender,
        completion,
        started_at: Instant::now(),
        first_frame_at: None,
    };
    Body::from_stream(stream::unfold(state, |mut state| async move {
        let (response_sender, response_receiver) = oneshot::channel();
        if state.demand_sender.send(response_sender).await.is_err() {
            return None;
        }

        match response_receiver.await {
            Ok(StreamEvent::Data(bytes)) => {
                state.record_frame_delivered(&bytes);
                Some((Ok(bytes), state))
            }
            Ok(StreamEvent::Failure { error, outcome }) => {
                state.completion.complete(outcome);
                Some((Err(error), state))
            }
            Ok(StreamEvent::Terminal(outcome)) => {
                state.completion.complete(outcome);
                None
            }
            Err(_) => None,
        }
    }))
}

/// Coordinates terminal delivery from the producer and downstream body.
/// `compare_exchange` guarantees exactly one lifecycle outcome even when a
/// client disconnect races an upstream deadline.
#[derive(Clone)]
struct StreamCompletion {
    sender: mpsc::UnboundedSender<StreamTerminalOutcome>,
    completed: Arc<AtomicBool>,
}

impl StreamCompletion {
    fn new() -> (Self, mpsc::UnboundedReceiver<StreamTerminalOutcome>) {
        let (sender, receiver) = mpsc::unbounded_channel();
        (
            Self {
                sender,
                completed: Arc::new(AtomicBool::new(false)),
            },
            receiver,
        )
    }

    fn complete(&self, outcome: StreamTerminalOutcome) {
        if self
            .completed
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
        {
            let _ = self.sender.send(outcome);
        }
    }
}

enum StreamEvent {
    Data(Bytes),
    Failure {
        error: axum::Error,
        outcome: StreamTerminalOutcome,
    },
    Terminal(StreamTerminalOutcome),
}

struct DownstreamStreamState {
    demand_sender: mpsc::Sender<oneshot::Sender<StreamEvent>>,
    completion: StreamCompletion,
    started_at: Instant,
    first_frame_at: Option<Instant>,
}

impl DownstreamStreamState {
    fn record_frame_delivered(&mut self, bytes: &Bytes) {
        if !bytes.is_empty() && self.first_frame_at.is_none() {
            self.first_frame_at = Some(Instant::now());
        }
    }

    fn ttft_ms(&self) -> Option<i64> {
        self.first_frame_at.map(|first_frame_at| {
            i64::try_from(first_frame_at.duration_since(self.started_at).as_millis())
                .unwrap_or(i64::MAX)
        })
    }
}

impl Drop for DownstreamStreamState {
    fn drop(&mut self) {
        // The producer-side usage accumulator lives in a different task, so a
        // dropped downstream body cannot attach partial usage here; the
        // producer's own terminal branches carry it instead.
        self.completion.complete(StreamTerminalOutcome::Cancelled {
            ttft_ms: self.ttft_ms(),
            partial_usage: None,
        });
    }
}

struct StreamProducerState {
    upstream: BoxStream<'static, Result<Bytes, axum::Error>>,
    usage: StreamingUsageAccumulator,
    /// 是否从转发给客户端的流里剔除 usage-only SSE 事件。网关为计费强制
    /// `stream_options.include_usage` 后，上游会多回一个 `choices: []` 的
    /// usage chunk；不希望让未主动开启该选项的客户端看到它。
    suppress_usage_only_events: bool,
    started_at: Instant,
    first_frame_at: Option<Instant>,
    total_deadline: TokioInstant,
    first_frame_deadline: TokioInstant,
    idle_deadline: Option<TokioInstant>,
    idle_timeout: Duration,
}

impl StreamProducerState {
    fn new(
        body: Body,
        usage_format: StreamingUsageFormat,
        timeouts: InvocationStreamTimeouts,
        suppress_usage_only_events: bool,
    ) -> Self {
        let started_at = Instant::now();
        let started_deadline = TokioInstant::now();
        Self {
            upstream: body.into_data_stream().boxed(),
            usage: StreamingUsageAccumulator::new(usage_format),
            suppress_usage_only_events: suppress_usage_only_events
                && usage_format == StreamingUsageFormat::ServerSentEvents,
            started_at,
            first_frame_at: None,
            total_deadline: started_deadline + timeouts.total,
            first_frame_deadline: started_deadline + timeouts.first_frame,
            idle_deadline: None,
            idle_timeout: timeouts.idle,
        }
    }

    /// 决定这一帧要不要转发；`None` 表示整帧都是 usage-only 事件，丢弃。
    fn forward_frame(&self, bytes: Bytes) -> Option<Bytes> {
        if bytes.is_empty() {
            return None;
        }
        if !self.suppress_usage_only_events {
            return Some(bytes);
        }
        strip_usage_only_events(bytes)
    }

    fn next_upstream_deadline(&self) -> (TokioInstant, &'static str) {
        let (progress_deadline, progress_stage) = match self.idle_deadline {
            Some(deadline) => (deadline, "idle"),
            None => (self.first_frame_deadline, "first_frame"),
        };
        if self.total_deadline <= progress_deadline {
            (self.total_deadline, "total")
        } else {
            (progress_deadline, progress_stage)
        }
    }

    fn record_frame_received(&mut self) {
        let now = Instant::now();
        if self.first_frame_at.is_none() {
            self.first_frame_at = Some(now);
        }
        self.idle_deadline = Some(TokioInstant::now() + self.idle_timeout);
    }

    fn ttft_ms(&self) -> Option<i64> {
        self.first_frame_at.map(|first_frame_at| {
            i64::try_from(first_frame_at.duration_since(self.started_at).as_millis())
                .unwrap_or(i64::MAX)
        })
    }
}

async fn run_stream_producer(
    body: Body,
    usage_format: StreamingUsageFormat,
    timeouts: InvocationStreamTimeouts,
    mut demand_receiver: mpsc::Receiver<oneshot::Sender<StreamEvent>>,
    completion: StreamCompletion,
    cancellation_signal: InvocationCancellationSignal,
    suppress_usage_only_events: bool,
) {
    let mut state =
        StreamProducerState::new(body, usage_format, timeouts, suppress_usage_only_events);
    loop {
        let demand_result = tokio::select! {
            biased;
            _ = cancellation_signal.wait_for_tenant_lease_loss() => {
                let partial_usage = state.usage.partial_usage_body();
                completion.complete(StreamTerminalOutcome::LeaseLost {
                    ttft_ms: state.ttft_ms(),
                    partial_usage,
                });
                return;
            }
            result = timeout_at(state.total_deadline, demand_receiver.recv()) => result,
        };
        let response_sender = match demand_result {
            Ok(Some(sender)) => sender,
            Ok(None) => {
                let partial_usage = state.usage.partial_usage_body();
                completion.complete(StreamTerminalOutcome::Cancelled {
                    ttft_ms: state.ttft_ms(),
                    partial_usage,
                });
                return;
            }
            Err(_) => {
                let partial_usage = state.usage.partial_usage_body();
                completion.complete(StreamTerminalOutcome::TimedOut {
                    stage: "total",
                    ttft_ms: state.ttft_ms(),
                    partial_usage,
                });
                return;
            }
        };

        let mut response_sender = response_sender;
        // 一帧可能整帧都是 usage-only 事件（被过滤）。此时继续读下一帧，
        // 而不是给这次 demand 回一个空帧——空帧会被视为有效数据并刷新 TTFT。
        loop {
            let (deadline, timeout_stage) = state.next_upstream_deadline();
            let next_frame = tokio::select! {
                biased;
                _ = cancellation_signal.wait_for_tenant_lease_loss() => {
                    let partial_usage = state.usage.partial_usage_body();
                    completion.complete(StreamTerminalOutcome::LeaseLost {
                        ttft_ms: state.ttft_ms(),
                        partial_usage,
                    });
                    return;
                }
                result = timeout_at(deadline, state.upstream.next()) => result,
                _ = response_sender.closed() => {
                    let partial_usage = state.usage.partial_usage_body();
                    completion.complete(StreamTerminalOutcome::Cancelled {
                        ttft_ms: state.ttft_ms(),
                        partial_usage,
                    });
                    return;
                }
            };
            match next_frame {
                Ok(Some(Ok(bytes))) => {
                    if !bytes.is_empty() {
                        state.record_frame_received();
                        if let Err(error) = state.usage.observe(&bytes) {
                            tracing::warn!(error_kind = ?error.kind, "stream usage accumulator rejected provider data");
                            let partial_usage = state.usage.partial_usage_body();
                            completion.complete(StreamTerminalOutcome::UpstreamError {
                                message: "stream usage accounting failed".to_owned(),
                                ttft_ms: state.ttft_ms(),
                                partial_usage,
                            });
                            return;
                        }
                    }
                    let Some(forward) = state.forward_frame(bytes) else {
                        // 整帧都是 usage-only 事件：丢弃，继续读下一帧（账单已由
                        // 累加器观察原始字节）。
                        continue;
                    };
                    if response_sender.send(StreamEvent::Data(forward)).is_err() {
                        let partial_usage = state.usage.partial_usage_body();
                        completion.complete(StreamTerminalOutcome::Cancelled {
                            ttft_ms: state.ttft_ms(),
                            partial_usage,
                        });
                        return;
                    }
                    break;
                }
                Ok(Some(Err(error))) => {
                    let partial_usage = state.usage.partial_usage_body();
                    let outcome = StreamTerminalOutcome::UpstreamError {
                        message: "upstream stream body could not be read".to_owned(),
                        ttft_ms: state.ttft_ms(),
                        partial_usage,
                    };
                    if response_sender
                        .send(StreamEvent::Failure { error, outcome })
                        .is_err()
                    {
                        let partial_usage = state.usage.partial_usage_body();
                        completion.complete(StreamTerminalOutcome::Cancelled {
                            ttft_ms: state.ttft_ms(),
                            partial_usage,
                        });
                    }
                    return;
                }
                Ok(None) => {
                    let outcome = match state.usage.finish() {
                        Ok(Some(usage_body)) => StreamTerminalOutcome::Completed {
                            usage_body: Some(usage_body),
                            ttft_ms: state.ttft_ms(),
                        },
                        // 上游正常结束却没有发 usage 帧：兼容上游忽略了
                        // `stream_options.include_usage`，或者该 vendor 的健康 SSE
                        // 本来就不带 usage。此时必须回落到「按已观测输出文本」的保守
                        // 估算——客户端已经完整收到响应，整条流免单是不可恢复的收入
                        // 损失，而低估只影响这一轮、下一轮可修正。只有连一个字符都没
                        // 观测到时才返回 `None`，由管线按 produces-no-billable-usage
                        // 报错（那是真的没有可结算的内容）。
                        Ok(None) => {
                            let estimated = state.usage.partial_usage_body();
                            StreamTerminalOutcome::Completed {
                                usage_body: estimated,
                                ttft_ms: state.ttft_ms(),
                            }
                        }
                        Err(error) => {
                            tracing::warn!(error_kind = ?error.kind, "stream usage accumulator failed at EOF");
                            let partial_usage = state.usage.partial_usage_body();
                            StreamTerminalOutcome::UpstreamError {
                                message: "stream usage accounting failed".to_owned(),
                                ttft_ms: state.ttft_ms(),
                                partial_usage,
                            }
                        }
                    };
                    if response_sender
                        .send(StreamEvent::Terminal(outcome))
                        .is_err()
                    {
                        let partial_usage = state.usage.partial_usage_body();
                        completion.complete(StreamTerminalOutcome::Cancelled {
                            ttft_ms: state.ttft_ms(),
                            partial_usage,
                        });
                    }
                    return;
                }
                Err(_) => {
                    let partial_usage = state.usage.partial_usage_body();
                    completion.complete(StreamTerminalOutcome::TimedOut {
                        stage: timeout_stage,
                        ttft_ms: state.ttft_ms(),
                        partial_usage,
                    });
                    return;
                }
            }
        }
    }
}

/// 从一帧 SSE 字节里剔除**完整的** usage-only 事件。
///
/// 只处理在同一帧内闭合的事件（以空行结尾）；跨帧拆分的 usage 事件保持原样
/// 转发（计费不受影响，客户端可能多看到一个空 choices 的 chunk）。这避免在
/// 转发链里引入逐事件缓冲与额外延迟。
fn strip_usage_only_events(bytes: Bytes) -> Option<Bytes> {
    let mut kept: Option<Vec<u8>> = None;
    let mut event_start = 0_usize;
    let mut cursor = 0_usize;
    while cursor < bytes.len() {
        let boundary = if bytes[cursor] == b'\n' && bytes.get(cursor + 1) == Some(&b'\n') {
            Some(cursor + 2)
        } else if bytes[cursor] == b'\r'
            && bytes.get(cursor + 1) == Some(&b'\n')
            && bytes.get(cursor + 2) == Some(&b'\r')
            && bytes.get(cursor + 3) == Some(&b'\n')
        {
            Some(cursor + 4)
        } else {
            None
        };
        let Some(event_end) = boundary else {
            cursor += 1;
            continue;
        };
        let event = &bytes[event_start..event_end];
        if is_usage_only_sse_event(event) {
            if kept.is_none() {
                let mut buffer = Vec::with_capacity(bytes.len());
                buffer.extend_from_slice(&bytes[..event_start]);
                kept = Some(buffer);
            }
            // 事件被丢弃：kept 已包含丢弃点之前的内容。
        } else if let Some(buffer) = kept.as_mut() {
            buffer.extend_from_slice(event);
        }
        event_start = event_end;
        cursor = event_end;
    }
    match kept {
        Some(mut buffer) => {
            buffer.extend_from_slice(&bytes[event_start..]);
            (!buffer.is_empty()).then(|| Bytes::from(buffer))
        }
        // 没有事件被剔除：原样返回（避免无谓的拷贝）。
        None => Some(bytes),
    }
}

/// 该 SSE 事件是否"只带 usage、没有内容"。
///
/// OpenAI 的 `include_usage` 终端帧形如
/// `data: {"choices":[],"usage":{...}}`；`choices` 为空（或缺省）且有非空
/// `usage` 即判定为 usage-only。无法解析的帧一律保留——过滤不能吞掉内容。
fn is_usage_only_sse_event(event: &[u8]) -> bool {
    let Ok(text) = std::str::from_utf8(event) else {
        return false;
    };
    let mut data = String::new();
    for line in text.split('\n') {
        let line = line.strip_suffix('\r').unwrap_or(line);
        let Some(payload) = line.strip_prefix("data:") else {
            continue;
        };
        if !data.is_empty() {
            data.push('\n');
        }
        data.push_str(payload.strip_prefix(' ').unwrap_or(payload));
    }
    let data = data.trim();
    if data.is_empty() || data == "[DONE]" {
        return false;
    }
    let Ok(value) = serde_json::from_str::<serde_json::Value>(data) else {
        return false;
    };
    let Some(object) = value.as_object() else {
        return false;
    };
    let has_usage = object.get("usage").is_some_and(|usage| !usage.is_null());
    let choices_empty = object
        .get("choices")
        .is_none_or(|choices| choices.as_array().is_some_and(|items| items.is_empty()));
    has_usage && choices_empty
}

fn streaming_usage_format(content_type: Option<&str>) -> StreamingUsageFormat {
    let content_type = content_type
        .unwrap_or_default()
        .split(';')
        .next()
        .unwrap_or_default()
        .trim();
    if content_type.eq_ignore_ascii_case("application/x-ndjson")
        || content_type.eq_ignore_ascii_case("application/ndjson")
    {
        return StreamingUsageFormat::Ndjson;
    }
    // Gemini 的 `:streamGenerateContent` 契约 200 响应是 `application/json`
    // （分块下发的 JSON 数组），不是 `text/event-stream`。缺这条映射时每一行都
    // 不是 `data:` 前缀，SSE 解析器一个用量字段都读不到 ⇒ 整条流免单。
    if content_type.eq_ignore_ascii_case("application/json")
        || content_type.eq_ignore_ascii_case("application/x-json")
        || content_type.eq_ignore_ascii_case("text/json")
    {
        return StreamingUsageFormat::JsonArray;
    }
    StreamingUsageFormat::ServerSentEvents
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runtime_total_timeout_is_used_when_account_timeout_is_absent() {
        let timeouts =
            InvocationStreamTimeouts::from_account_timeout(None, Duration::from_millis(75));
        assert_eq!(Duration::from_millis(75), timeouts.total);
        assert_eq!(Duration::from_millis(75), timeouts.first_frame);
        assert_eq!(Duration::from_millis(75), timeouts.idle);
    }

    #[test]
    fn account_timeout_overrides_runtime_default() {
        let timeouts = InvocationStreamTimeouts::from_account_timeout(
            Some(Duration::from_millis(40)),
            Duration::from_secs(5),
        );
        assert_eq!(Duration::from_millis(40), timeouts.total);
        assert_eq!(Duration::from_millis(40), timeouts.first_frame);
        assert_eq!(Duration::from_millis(40), timeouts.idle);
    }

    fn stripped(input: &'static str) -> Option<String> {
        strip_usage_only_events(Bytes::from_static(input.as_bytes()))
            .map(|bytes| String::from_utf8(bytes.to_vec()).expect("utf-8"))
    }

    #[test]
    fn usage_only_event_is_stripped_and_done_is_kept() {
        let input = "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":2}}\n\ndata: [DONE]\n\n";
        assert_eq!(Some("data: [DONE]\n\n".to_owned()), stripped(input));
    }

    #[test]
    fn content_event_is_preserved_byte_for_byte() {
        let input = "data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\n";
        let output = strip_usage_only_events(Bytes::from_static(input.as_bytes()));
        assert_eq!(
            Some(Bytes::from_static(input.as_bytes())),
            output,
            "a normal content event must be forwarded unchanged"
        );
    }

    #[test]
    fn usage_with_non_empty_choices_is_kept() {
        let input = "data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}],\"usage\":{\"prompt_tokens\":10}}\n\n";
        assert_eq!(Some(input.to_owned()), stripped(input));
    }

    #[test]
    fn a_usage_event_split_across_frames_is_forwarded_untouched() {
        // 只有完整闭合的事件才可能被剔除；跨帧拆分时保持原样（计费不受影响）。
        let input = "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":10}}\n";
        assert_eq!(Some(input.to_owned()), stripped(input));
    }

    #[test]
    fn multiple_events_in_one_frame_strip_only_the_usage_event() {
        let input = concat!(
            "data: {\"choices\":[{\"delta\":{\"content\":\"a\"}}]}\n\n",
            "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":3}}\n\n",
            "data: [DONE]\n\n"
        );
        assert_eq!(
            Some(
                concat!(
                    "data: {\"choices\":[{\"delta\":{\"content\":\"a\"}}]}\n\n",
                    "data: [DONE]\n\n"
                )
                .to_owned()
            ),
            stripped(input)
        );
    }
}
