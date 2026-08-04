use std::fmt::{Debug, Formatter};
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};

use axum::body::Body;
use axum::response::Response;
use bytes::Bytes;
use hyper::body::{Body as HttpBody, Frame, SizeHint};

/// Opaque ownership guard for a process-wide buffered-response reservation.
/// Clones share one reservation and release it only after the final body owner
/// is dropped.
#[derive(Clone)]
pub struct ProviderResponseMemoryGuard {
    _owner: Arc<dyn Send + Sync>,
}

impl ProviderResponseMemoryGuard {
    pub(crate) fn new<T>(owner: T) -> Self
    where
        T: Send + Sync + 'static,
    {
        Self {
            _owner: Arc::new(owner),
        }
    }

    /// Wrap response bytes so the reservation remains held until downstream
    /// delivery reaches EOF or the body is dropped.
    pub fn wrap_body(self, body: Vec<u8>) -> Body {
        self.wrap_axum_body(Body::from(body))
    }

    /// Retains the reservation for an already assembled HTTP response without
    /// changing its status or headers.
    pub fn wrap_response(self, response: Response) -> Response {
        let (parts, body) = response.into_parts();
        Response::from_parts(parts, self.wrap_axum_body(body))
    }

    fn wrap_axum_body(self, body: Body) -> Body {
        Body::new(MemoryGuardedResponseBody {
            inner: body,
            _memory_guard: self,
        })
    }
}

impl Debug for ProviderResponseMemoryGuard {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("ProviderResponseMemoryGuard(<opaque>)")
    }
}

impl PartialEq for ProviderResponseMemoryGuard {
    fn eq(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self._owner, &other._owner)
    }
}

impl Eq for ProviderResponseMemoryGuard {}

struct MemoryGuardedResponseBody {
    inner: Body,
    _memory_guard: ProviderResponseMemoryGuard,
}

impl HttpBody for MemoryGuardedResponseBody {
    type Data = Bytes;
    type Error = axum::Error;

    fn poll_frame(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Self::Data>, Self::Error>>> {
        Pin::new(&mut self.get_mut().inner).poll_frame(context)
    }

    fn is_end_stream(&self) -> bool {
        self.inner.is_end_stream()
    }

    fn size_hint(&self) -> SizeHint {
        self.inner.size_hint()
    }
}
