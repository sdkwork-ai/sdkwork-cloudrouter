use std::future::Future;
use std::pin::Pin;

use super::{Invocation, InvocationError};

pub type InvocationFuture<'a, T> =
    Pin<Box<dyn Future<Output = Result<T, InvocationError>> + Send + 'a>>;

pub trait InvocationInterceptor: Send + Sync + 'static {
    fn name(&self) -> &str;

    /// Returns whether this interceptor must run its `after` hook before a
    /// streaming response is handed to the HTTP transport.
    ///
    /// Most completion work belongs to the terminal stream lifecycle so that
    /// usage, idempotency, circuit state, and tenant permits describe the
    /// actual body lifetime rather than just the response headers.
    fn completes_before_stream(&self) -> bool {
        false
    }

    fn observe_pipeline_errors(&self) -> bool {
        false
    }

    fn before<'a>(&'a self, _invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }

    fn after<'a>(&'a self, _invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }

    fn on_error<'a>(
        &'a self,
        _invocation: &'a mut Invocation,
        _error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }
}
