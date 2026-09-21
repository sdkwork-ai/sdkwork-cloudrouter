use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::{Duration, Instant};

use axum::body::Body;
use bytes::Bytes;
use http_body::Frame;

/// Total stream lifetime applied when a caller has no request-specific
/// stream timeout configured (30 minutes, matching the relay default
/// `DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT_MILLIS`).
pub(crate) const DEFAULT_PROVIDER_STREAM_TOTAL: Duration = Duration::from_secs(1_800);

/// Applies bounded total and idle deadlines to a relayed provider stream.
///
/// The response-header timeout only bounds header arrival; without this
/// wrapper a provider that opens an SSE stream and then stalls pins the
/// client connection, the upstream connection, and the pipeline state
/// indefinitely (HTTP/1 upstreams send no keep-alive pings). The wrapper
/// never buffers frames: each frame is forwarded as it arrives and the idle
/// timer restarts on every frame. A stalled stream fails the body with a
/// typed error so the gateway can settle partial usage and free the slot.
///
/// `total_timeout` bounds the whole stream lifetime; the idle gap is clamped
/// to `1..=60` seconds so a dead upstream is detected promptly. The idle
/// bound also acts as the first-frame deadline.
pub(crate) fn apply_provider_stream_deadlines(body: Body, total_timeout: Duration) -> Body {
    let idle = total_timeout
        .min(Duration::from_secs(60))
        .max(Duration::from_secs(1));
    Body::new(ProviderStreamDeadlineBody {
        inner: body,
        total_deadline: Instant::now() + total_timeout,
        idle,
        idle_timer: None,
    })
}

struct ProviderStreamDeadlineBody {
    inner: Body,
    total_deadline: Instant,
    idle: Duration,
    idle_timer: Option<Pin<Box<dyn Future<Output = ()> + Send>>>,
}

impl http_body::Body for ProviderStreamDeadlineBody {
    type Data = Bytes;
    type Error = axum::Error;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Self::Data>, Self::Error>>> {
        if Instant::now() >= self.total_deadline {
            return Poll::Ready(Some(Err(axum::Error::new(std::io::Error::other(
                "provider stream exceeded the total response deadline",
            )))));
        }
        match Pin::new(&mut self.inner).poll_frame(cx) {
            Poll::Ready(Some(Ok(frame))) => {
                // A frame arrived: restart the idle timer for the next gap.
                self.idle_timer = Some(Box::pin(tokio::time::sleep(self.idle)));
                Poll::Ready(Some(Ok(frame)))
            }
            Poll::Ready(Some(Err(error))) => Poll::Ready(Some(Err(error))),
            Poll::Ready(None) => Poll::Ready(None),
            Poll::Pending => {
                // No frame yet: poll the idle timer in the same call so its
                // waker is registered with the consumer. Without this, a
                // stalled upstream that never wakes the inner body would
                // never wake the timer either and the stream would hang.
                let idle = self.idle;
                let timer = self
                    .idle_timer
                    .get_or_insert_with(|| Box::pin(tokio::time::sleep(idle)));
                if timer.as_mut().poll(cx).is_ready() {
                    return Poll::Ready(Some(Err(axum::Error::new(std::io::Error::other(
                        "provider stream idle deadline exceeded",
                    )))));
                }
                Poll::Pending
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    /// A body that never yields a frame and never errors: models an upstream
    /// that opened the stream and then stalled.
    struct StalledBody;

    impl http_body::Body for StalledBody {
        type Data = Bytes;
        type Error = axum::Error;

        fn poll_frame(
            self: Pin<&mut Self>,
            _cx: &mut Context<'_>,
        ) -> Poll<Option<Result<Frame<Self::Data>, Self::Error>>> {
            Poll::Pending
        }
    }

    #[tokio::test]
    async fn stalled_stream_fails_at_the_idle_deadline() {
        // A 1s total clamps the idle gap to 1s, so a stalled upstream must
        // surface the idle-deadline error through the axum body stack instead
        // of hanging the consumer.
        let body = apply_provider_stream_deadlines(Body::new(StalledBody), Duration::from_secs(1));
        let started = Instant::now();
        let mut body = body;
        let outcome = loop {
            match tokio::time::timeout(
                Duration::from_secs(3),
                http_body_util::BodyExt::frame(&mut body),
            )
            .await
            {
                Ok(Some(Err(_))) => break Instant::now() - started,
                Ok(Some(Ok(_))) => continue,
                Ok(None) => panic!("idle-deadline body must end with an error"),
                Err(_) => panic!("idle deadline never woke the consumer within 3s"),
            }
        };
        assert!(
            outcome >= Duration::from_millis(900) && outcome <= Duration::from_secs(2),
            "idle deadline must fire around 1s, got {outcome:?}"
        );
    }

    #[tokio::test]
    async fn frames_pass_through_before_the_deadline() {
        let body =
            apply_provider_stream_deadlines(Body::from("data: hello\n\n"), Duration::from_secs(30));
        let buffered = http_body_util::BodyExt::collect(body)
            .await
            .expect("healthy stream must not fail");
        assert_eq!(buffered.to_bytes(), &b"data: hello\n\n"[..]);
    }
}
