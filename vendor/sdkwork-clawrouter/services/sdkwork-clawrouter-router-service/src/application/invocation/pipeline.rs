use std::sync::Arc;

use super::{Invocation, InvocationError, InvocationInterceptor};

#[derive(Clone, Default)]
pub struct InvocationPipeline {
    interceptors: Vec<Arc<dyn InvocationInterceptor>>,
}

impl InvocationPipeline {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_interceptor<I>(mut self, interceptor: I) -> Self
    where
        I: InvocationInterceptor,
    {
        self.interceptors.push(Arc::new(interceptor));
        self
    }

    pub fn interceptor_count(&self) -> usize {
        self.interceptors.len()
    }

    pub async fn execute(&self, invocation: &mut Invocation) -> Result<(), InvocationError> {
        let mut started = Vec::new();
        for (index, interceptor) in self.interceptors.iter().enumerate() {
            match interceptor.before(invocation).await {
                Ok(()) => started.push(index),
                Err(error) => {
                    started.push(index);
                    self.notify_error(invocation, &started, &error).await;
                    return Err(error);
                }
            }
        }

        for index in started.iter().rev() {
            if let Err(error) = self.interceptors[*index].after(invocation).await {
                self.notify_error(invocation, &started, &error).await;
                return Err(error);
            }
        }

        Ok(())
    }

    async fn notify_error(
        &self,
        invocation: &mut Invocation,
        started: &[usize],
        error: &InvocationError,
    ) {
        for index in started.iter().rev() {
            let _ = self.interceptors[*index].on_error(invocation, error).await;
        }
        for (index, interceptor) in self.interceptors.iter().enumerate().rev() {
            if started.contains(&index) || !interceptor.observe_pipeline_errors() {
                continue;
            }
            let _ = interceptor.on_error(invocation, error).await;
        }
    }
}
