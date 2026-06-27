use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::error::RepositoryResult;

pub type AdminMonitorReadFuture<'a, T> =
    Pin<Box<dyn Future<Output = RepositoryResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminMonitorSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminMonitorQuery {
    pub subject: AdminMonitorSubject,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminMonitorNode {
    pub id: String,
    pub name: String,
    pub region: String,
    pub status: String,
    pub cpu: f64,
    pub memory: f64,
    pub uptime: String,
    pub ip: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AdminMonitorAlert {
    pub id: String,
    pub severity: String,
    pub title: String,
    pub message: String,
    pub time: String,
    pub status: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminMonitorPerformanceDatum {
    pub time: String,
    pub cpu: f64,
    pub memory: f64,
    pub network: f64,
}

pub trait AdminMonitorReadStore {
    fn list_monitor_nodes<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorNode>>;

    fn list_monitor_alerts<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorAlert>>;

    fn list_monitor_performance<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorPerformanceDatum>>;
}
