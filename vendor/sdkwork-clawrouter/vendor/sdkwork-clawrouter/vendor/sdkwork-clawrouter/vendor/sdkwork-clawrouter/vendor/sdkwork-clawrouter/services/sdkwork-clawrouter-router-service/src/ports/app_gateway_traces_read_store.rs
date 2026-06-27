use std::future::Future;
use std::pin::Pin;

pub use sdkwork_clawrouter_app_gateway_traces_repository_sqlx::{
    AppGatewayTraceItem, AppGatewayTraceItems, AppGatewayTracesSubject,
};

use crate::domain::DomainResult;

pub type AppGatewayTracesReadFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub trait AppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        subject: Option<AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a, Vec<AppGatewayTraceItem>>;
}
