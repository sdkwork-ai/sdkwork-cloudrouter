use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type AppGenerationHistoryReadFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppGenerationHistorySubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppGenerationHistoryItems {
    pub items: Vec<AppGenerationHistoryItem>,
}

impl AppGenerationHistoryItems {
    pub fn new(items: Vec<AppGenerationHistoryItem>) -> Self {
        Self { items }
    }
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppGenerationHistoryItem {
    pub id: String,
    pub date: String,
    pub prompt: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub images: Vec<serde_json::Value>,
    pub videos: Vec<serde_json::Value>,
}

pub trait AppGenerationHistoryReadStore {
    fn load_generation_history<'a>(
        &'a self,
        subject: Option<AppGenerationHistorySubject>,
    ) -> AppGenerationHistoryReadFuture<'a, Vec<AppGenerationHistoryItem>>;
}
