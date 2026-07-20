use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::body::{Body, Bytes};
use futures_util::stream::{self, BoxStream};
use futures_util::StreamExt;
use sdkwork_clawrouter_router_service::application::{
    DeferredStreamInvocation, StreamTerminalOutcome, StreamingUsageAccumulator,
    StreamingUsageFormat,
};
use tokio::sync::{mpsc, oneshot};
use tokio::time::{timeout_at, Instant as TokioInstant};

pub(crate) const DEFAULT_STREAM_TOTAL_TIMEOUT: Duration = Duration::from_secs(120);
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
) -> Body {
    let (completion, mut terminal_receiver) = StreamCompletion::new();
    tokio::spawn(async move {
        let outcome = terminal_receiver
            .recv()
            .await
            .unwrap_or(StreamTerminalOutcome::Cancelled { ttft_ms: None });
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
        self.completion.complete(StreamTerminalOutcome::Cancelled {
            ttft_ms: self.ttft_ms(),
        });
    }
}

struct StreamProducerState {
    upstream: BoxStream<'static, Result<Bytes, axum::Error>>,
    usage: StreamingUsageAccumulator,
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
    ) -> Self {
        let started_at = Instant::now();
        let started_deadline = TokioInstant::now();
        Self {
            upstream: body.into_data_stream().boxed(),
            usage: StreamingUsageAccumulator::new(usage_format),
            started_at,
            first_frame_at: None,
            total_deadline: started_deadline + timeouts.total,
            first_frame_deadline: started_deadline + timeouts.first_frame,
            idle_deadline: None,
            idle_timeout: timeouts.idle,
        }
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
) {
    let mut state = StreamProducerState::new(body, usage_format, timeouts);
    loop {
        let response_sender = match timeout_at(state.total_deadline, demand_receiver.recv()).await {
            Ok(Some(sender)) => sender,
            Ok(None) => {
                completion.complete(StreamTerminalOutcome::Cancelled {
                    ttft_ms: state.ttft_ms(),
                });
                return;
            }
            Err(_) => {
                completion.complete(StreamTerminalOutcome::TimedOut {
                    stage: "total",
                    ttft_ms: state.ttft_ms(),
                });
                return;
            }
        };

        let (deadline, timeout_stage) = state.next_upstream_deadline();
        let mut response_sender = response_sender;
        let next_frame = tokio::select! {
            result = timeout_at(deadline, state.upstream.next()) => result,
            _ = response_sender.closed() => {
                completion.complete(StreamTerminalOutcome::Cancelled {
                    ttft_ms: state.ttft_ms(),
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
                        completion.complete(StreamTerminalOutcome::UpstreamError {
                            message: "stream usage accounting failed".to_owned(),
                            ttft_ms: state.ttft_ms(),
                        });
                        return;
                    }
                }
                if response_sender.send(StreamEvent::Data(bytes)).is_err() {
                    completion.complete(StreamTerminalOutcome::Cancelled {
                        ttft_ms: state.ttft_ms(),
                    });
                    return;
                }
            }
            Ok(Some(Err(error))) => {
                let outcome = StreamTerminalOutcome::UpstreamError {
                    message: "upstream stream body could not be read".to_owned(),
                    ttft_ms: state.ttft_ms(),
                };
                if response_sender
                    .send(StreamEvent::Failure { error, outcome })
                    .is_err()
                {
                    completion.complete(StreamTerminalOutcome::Cancelled {
                        ttft_ms: state.ttft_ms(),
                    });
                }
                return;
            }
            Ok(None) => {
                let outcome = match state.usage.finish() {
                    Ok(usage_body) => StreamTerminalOutcome::Completed {
                        usage_body,
                        ttft_ms: state.ttft_ms(),
                    },
                    Err(error) => {
                        tracing::warn!(error_kind = ?error.kind, "stream usage accumulator failed at EOF");
                        StreamTerminalOutcome::UpstreamError {
                            message: "stream usage accounting failed".to_owned(),
                            ttft_ms: state.ttft_ms(),
                        }
                    }
                };
                if response_sender
                    .send(StreamEvent::Terminal(outcome))
                    .is_err()
                {
                    completion.complete(StreamTerminalOutcome::Cancelled {
                        ttft_ms: state.ttft_ms(),
                    });
                }
                return;
            }
            Err(_) => {
                completion.complete(StreamTerminalOutcome::TimedOut {
                    stage: timeout_stage,
                    ttft_ms: state.ttft_ms(),
                });
                return;
            }
        }
    }
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
        StreamingUsageFormat::Ndjson
    } else {
        StreamingUsageFormat::ServerSentEvents
    }
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
}
