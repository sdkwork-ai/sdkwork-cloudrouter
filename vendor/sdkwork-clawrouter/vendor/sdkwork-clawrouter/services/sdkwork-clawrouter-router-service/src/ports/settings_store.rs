use std::future::Future;
use std::pin::Pin;

use serde::{Deserialize, Serialize};

use crate::domain::DomainResult;

pub type SettingsReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<SettingsData>> + Send + 'a>>;
pub type SettingsCommandFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<UpdateSettingsOutcome>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SettingsSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(default, rename_all = "camelCase")]
pub struct SettingsNotifications {
    pub bill_reminder: bool,
    pub quota_warning: bool,
    pub api_monitor: bool,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SettingsData {
    pub language: String,
    pub timezone: String,
    pub webhook_url: String,
    pub notifications: SettingsNotifications,
}

impl SettingsData {
    pub fn standard_default() -> Self {
        Self {
            language: "en-US".to_owned(),
            timezone: "UTC".to_owned(),
            webhook_url: String::new(),
            notifications: SettingsNotifications::default(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateSettingsCommand {
    pub subject: SettingsSubject,
    pub settings: SettingsData,
    pub preference_uuid: String,
    pub webhook_uuid: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, Copy, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsOutcome {
    pub success: bool,
}

pub trait SettingsStore {
    fn load_settings<'a>(&'a self, subject: Option<SettingsSubject>) -> SettingsReadFuture<'a>;

    fn update_settings<'a>(&'a self, command: UpdateSettingsCommand) -> SettingsCommandFuture<'a>;
}
