use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub const DEFAULT_RUNTIME_REGION_CODE: &str = "cn";
pub const DEFAULT_RUNTIME_REGION_NAME: &str = "China";

pub type RuntimeRegionSettingsFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RuntimeRegionSettingsSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeRegionSettings {
    pub current_region_code: String,
    pub current_region_name: String,
    pub remark: String,
}

impl Default for RuntimeRegionSettings {
    fn default() -> Self {
        Self {
            current_region_code: DEFAULT_RUNTIME_REGION_CODE.to_owned(),
            current_region_name: DEFAULT_RUNTIME_REGION_NAME.to_owned(),
            remark: "Default runtime region for route, endpoint, and regional pricing selection."
                .to_owned(),
        }
    }
}

impl RuntimeRegionSettings {
    pub fn normalized(mut self) -> Self {
        self.current_region_code = normalize_region_code(&self.current_region_code);
        if self.current_region_code.is_empty() {
            self.current_region_code = DEFAULT_RUNTIME_REGION_CODE.to_owned();
        }
        self.current_region_name = self.current_region_name.trim().to_owned();
        if self.current_region_name.is_empty() {
            self.current_region_name = match self.current_region_code.as_str() {
                "cn" => DEFAULT_RUNTIME_REGION_NAME.to_owned(),
                "global" => "Global".to_owned(),
                "us" => "United States".to_owned(),
                "eu" => "Europe".to_owned(),
                region => region.to_owned(),
            };
        }
        self.remark = self.remark.trim().to_owned();
        self
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GetRuntimeRegionSettingsQuery {
    pub subject: RuntimeRegionSettingsSubject,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GetRuntimeRegionSettingsScopeQuery {
    pub tenant_code: Option<String>,
    pub organization_code: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateRuntimeRegionSettingsCommand {
    pub subject: RuntimeRegionSettingsSubject,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub settings: RuntimeRegionSettings,
    pub request_id: String,
    pub requested_at: String,
}

pub trait RuntimeRegionSettingsStore {
    fn get_runtime_region_settings<'a>(
        &'a self,
        query: GetRuntimeRegionSettingsQuery,
    ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings>;

    fn get_runtime_region_settings_for_scope<'a>(
        &'a self,
        query: GetRuntimeRegionSettingsScopeQuery,
    ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings>;

    fn update_runtime_region_settings<'a>(
        &'a self,
        command: UpdateRuntimeRegionSettingsCommand,
    ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings>;
}

fn normalize_region_code(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}
