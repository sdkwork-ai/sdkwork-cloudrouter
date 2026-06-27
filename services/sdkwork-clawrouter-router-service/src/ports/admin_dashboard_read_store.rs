use std::future::Future;
use std::pin::Pin;

pub use sdkwork_clawrouter_admin_dashboard_repository_sqlx::{
    AdminDashboardQuery, AdminDashboardRecentUsageItem, AdminDashboardSnapshot,
    AdminDashboardSubject, AdminDashboardTrafficItem, AdminPieChartItem,
};

use crate::domain::DomainResult;

pub type AdminDashboardReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<AdminDashboardSnapshot>> + Send + 'a>>;

pub trait AdminDashboardReadStore {
    fn load_dashboard<'a>(&'a self, query: AdminDashboardQuery) -> AdminDashboardReadFuture<'a>;
}
