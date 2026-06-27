use std::future::Future;
use std::pin::Pin;

use serde::{Deserialize, Serialize};

use crate::domain::DomainResult;

pub type AppRoutingStrategyFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppRoutingStrategySubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AppRoutingStrategyType {
    #[default]
    Latency,
    Weighted,
    Cost,
}

impl AppRoutingStrategyType {
    pub fn code(self) -> i64 {
        match self {
            Self::Latency => 1,
            Self::Weighted => 2,
            Self::Cost => 3,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Latency => "latency",
            Self::Weighted => "weighted",
            Self::Cost => "cost",
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingMappingRule {
    pub id: String,
    pub source_model: String,
    pub target_model: String,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingStrategySnapshot {
    pub strategy: AppRoutingStrategyType,
    pub mapping_rules: Vec<AppRoutingMappingRule>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAppRoutingStrategyCommand {
    pub subject: AppRoutingStrategySubject,
    pub snapshot: AppRoutingStrategySnapshot,
    pub policy_uuid: String,
    pub profile_uuid: String,
    pub rule_uuids: Vec<String>,
    pub requested_at: String,
}

#[derive(Debug, Clone, Copy, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAppRoutingStrategyOutcome {
    pub success: bool,
}

pub trait AppRoutingStrategyStore {
    fn load_routing_strategy<'a>(
        &'a self,
        subject: Option<AppRoutingStrategySubject>,
    ) -> AppRoutingStrategyFuture<'a, AppRoutingStrategySnapshot>;

    fn update_routing_strategy<'a>(
        &'a self,
        command: UpdateAppRoutingStrategyCommand,
    ) -> AppRoutingStrategyFuture<'a, UpdateAppRoutingStrategyOutcome>;
}
