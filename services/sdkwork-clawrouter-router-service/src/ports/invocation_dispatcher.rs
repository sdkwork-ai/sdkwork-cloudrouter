use std::future::Future;
use std::pin::Pin;

use crate::application::{Invocation, InvocationAccount, InvocationDispatchResponse};

pub type InvocationDispatcherFuture<'a> = Pin<
    Box<
        dyn Future<Output = Result<InvocationDispatchResponse, InvocationDispatchError>>
            + Send
            + 'a,
    >,
>;

pub trait InvocationDispatcher: Send + Sync + 'static {
    fn dispatch<'a>(
        &'a self,
        invocation: &'a Invocation,
        account: &'a InvocationAccount,
    ) -> InvocationDispatcherFuture<'a>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationDispatchError {
    pub code: String,
    pub message: String,
    pub status_code: Option<u16>,
    pub retryable: bool,
}

impl InvocationDispatchError {
    pub fn new(
        code: impl Into<String>,
        message: impl Into<String>,
        status_code: Option<u16>,
        retryable: bool,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            status_code,
            retryable,
        }
    }
}
