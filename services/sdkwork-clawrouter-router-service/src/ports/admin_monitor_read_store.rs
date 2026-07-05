use std::future::Future;
use std::pin::Pin;

pub use sdkwork_clawrouter_admin_monitor_repository_sqlx::{
    AdminMonitorAlert, AdminMonitorCollection, AdminMonitorNode, AdminMonitorPerformanceDatum,
    AdminMonitorQuery, AdminMonitorSubject,
};

use crate::domain::DomainResult;

pub type AdminMonitorReadFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub trait AdminMonitorReadStore {
    fn list_monitor_nodes<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, AdminMonitorCollection<AdminMonitorNode>>;

    fn list_monitor_alerts<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, AdminMonitorCollection<AdminMonitorAlert>>;

    fn list_monitor_performance<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, AdminMonitorCollection<AdminMonitorPerformanceDatum>>;
}
