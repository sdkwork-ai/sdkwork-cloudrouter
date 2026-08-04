use serde::{Deserialize, Serialize};

use crate::domain::{DomainError, DomainResult};
use crate::ports::RuntimeRegionSettings;

pub(crate) const RUNTIME_REGION_SETTINGS_SOURCE_TABLE: &str = "ops_runtime_region_settings";
pub(crate) const RUNTIME_REGION_SETTINGS_AUDIT_TARGET_TYPE: i32 = 67;
pub(crate) const CONFIG_SCOPE_RUNTIME_REGION: i32 = 50;
pub(crate) const CONFIG_TYPE_RUNTIME_REGION_SETTINGS: i32 =
    RUNTIME_REGION_SETTINGS_AUDIT_TARGET_TYPE;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub(crate) struct StoredRuntimeRegionSettings {
    pub current_region_code: String,
    pub current_region_name: String,
    pub remark: String,
}

impl Default for StoredRuntimeRegionSettings {
    fn default() -> Self {
        RuntimeRegionSettings::default().into()
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredRuntimeRegionSettingsEnvelope {
    action: Option<String>,
    settings: StoredRuntimeRegionSettings,
}

impl From<RuntimeRegionSettings> for StoredRuntimeRegionSettings {
    fn from(value: RuntimeRegionSettings) -> Self {
        Self {
            current_region_code: value.current_region_code,
            current_region_name: value.current_region_name,
            remark: value.remark,
        }
    }
}

impl From<StoredRuntimeRegionSettings> for RuntimeRegionSettings {
    fn from(value: StoredRuntimeRegionSettings) -> Self {
        Self {
            current_region_code: value.current_region_code,
            current_region_name: value.current_region_name,
            remark: value.remark,
        }
    }
}

pub(crate) fn settings_payload(settings: &RuntimeRegionSettings) -> DomainResult<String> {
    serde_json::to_string(&StoredRuntimeRegionSettings::from(settings.clone()))
        .map_err(|error| DomainError::new(error.to_string()))
}

pub(crate) fn settings_snapshot_payload(settings: &RuntimeRegionSettings) -> DomainResult<String> {
    serde_json::to_string(&StoredRuntimeRegionSettingsEnvelope {
        action: Some("update_runtime_region_settings".to_owned()),
        settings: StoredRuntimeRegionSettings::from(settings.clone()),
    })
    .map_err(|error| DomainError::new(error.to_string()))
}

pub(crate) fn settings_from_payload(payload: &str) -> DomainResult<RuntimeRegionSettings> {
    if payload.trim().is_empty() {
        return Ok(RuntimeRegionSettings::default());
    }
    let value = serde_json::from_str::<serde_json::Value>(payload)
        .map_err(|error| DomainError::new(error.to_string()))?;
    let settings = value.get("settings").cloned().unwrap_or(value);
    serde_json::from_value::<StoredRuntimeRegionSettings>(settings)
        .map(RuntimeRegionSettings::from)
        .map(RuntimeRegionSettings::normalized)
        .map_err(|error| DomainError::new(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::{settings_from_payload, settings_payload, settings_snapshot_payload};
    use crate::ports::RuntimeRegionSettings;

    #[test]
    fn settings_from_payload_defaults_to_china() {
        let settings = settings_from_payload("").unwrap();

        assert_eq!("cn", settings.current_region_code);
        assert_eq!("China", settings.current_region_name);
    }

    #[test]
    fn settings_payload_round_trips_snapshot() {
        let settings = RuntimeRegionSettings {
            current_region_code: "us".to_owned(),
            current_region_name: "United States".to_owned(),
            remark: "US default".to_owned(),
        };

        for payload in [
            settings_payload(&settings).unwrap(),
            settings_snapshot_payload(&settings).unwrap(),
        ] {
            let decoded = settings_from_payload(&payload).unwrap();
            assert_eq!("us", decoded.current_region_code);
            assert_eq!("United States", decoded.current_region_name);
            assert_eq!("US default", decoded.remark);
        }
    }
}
