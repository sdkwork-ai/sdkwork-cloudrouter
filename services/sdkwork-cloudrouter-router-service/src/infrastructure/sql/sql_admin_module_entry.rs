use serde::{Deserialize, Serialize};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{AdminModuleEntries, AdminModuleEntry};

/// Logical config source recorded on `ops_config_snapshot.source_table`.
///
/// The ordered header module list is a versioned configuration document, so it
/// is persisted through the shared `ops_config_snapshot` + `ops_audit_log`
/// pipeline that every other Cloud Router admin setting uses. No dedicated
/// table is created: the snapshot row is the system of record for the current
/// list, and the audit row is the change log.
pub(crate) const ADMIN_MODULE_ENTRY_SOURCE_TABLE: &str = "ops_admin_module_entry";
pub(crate) const ADMIN_MODULE_ENTRY_AUDIT_TARGET_TYPE: i32 = 84;
pub(crate) const CONFIG_SCOPE_ADMIN_SHELL: i32 = 60;
pub(crate) const CONFIG_TYPE_ADMIN_MODULE_ENTRY: i32 = ADMIN_MODULE_ENTRY_AUDIT_TARGET_TYPE;
pub(crate) const ADMIN_MODULE_ENTRY_ACTION: &str = "update_admin_module_entries";

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredAdminModuleEntry {
    pub module_id: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredAdminModuleEntries {
    pub entries: Vec<StoredAdminModuleEntry>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredAdminModuleEntriesEnvelope {
    action: Option<String>,
    entries: Vec<StoredAdminModuleEntry>,
}

impl From<AdminModuleEntries> for StoredAdminModuleEntries {
    fn from(value: AdminModuleEntries) -> Self {
        Self {
            entries: value
                .entries
                .into_iter()
                .map(|entry| StoredAdminModuleEntry {
                    module_id: entry.module_id,
                    enabled: entry.enabled,
                })
                .collect(),
        }
    }
}

impl From<StoredAdminModuleEntries> for AdminModuleEntries {
    fn from(value: StoredAdminModuleEntries) -> Self {
        Self {
            entries: value
                .entries
                .into_iter()
                .map(|entry| AdminModuleEntry {
                    module_id: entry.module_id,
                    enabled: entry.enabled,
                })
                .collect(),
        }
    }
}

impl From<&AdminModuleEntries> for StoredAdminModuleEntries {
    fn from(value: &AdminModuleEntries) -> Self {
        Self::from(value.clone())
    }
}

pub(crate) fn entries_payload(entries: &AdminModuleEntries) -> DomainResult<String> {
    serde_json::to_string(&StoredAdminModuleEntries::from(entries))
        .map_err(|error| DomainError::new(error.to_string()))
}

pub(crate) fn entries_snapshot_payload(entries: &AdminModuleEntries) -> DomainResult<String> {
    serde_json::to_string(&StoredAdminModuleEntriesEnvelope {
        action: Some(ADMIN_MODULE_ENTRY_ACTION.to_owned()),
        entries: StoredAdminModuleEntries::from(entries).entries,
    })
    .map_err(|error| DomainError::new(error.to_string()))
}

pub(crate) fn entries_from_payload(payload: &str) -> DomainResult<AdminModuleEntries> {
    if payload.trim().is_empty() {
        return Ok(AdminModuleEntries::default());
    }
    let value = serde_json::from_str::<serde_json::Value>(payload)
        .map_err(|error| DomainError::new(error.to_string()))?;
    let entries = value.get("entries").cloned().unwrap_or(value);
    serde_json::from_value::<StoredAdminModuleEntries>(serde_json::json!({ "entries": entries }))
        .map(AdminModuleEntries::from)
        .map(AdminModuleEntries::normalized)
        .map_err(|error| DomainError::new(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::{entries_from_payload, entries_payload, entries_snapshot_payload};
    use crate::ports::{AdminModuleEntries, AdminModuleEntry};

    fn sample_entries() -> AdminModuleEntries {
        AdminModuleEntries {
            entries: vec![
                AdminModuleEntry {
                    module_id: "home".to_owned(),
                    enabled: true,
                },
                AdminModuleEntry {
                    module_id: "operations".to_owned(),
                    enabled: false,
                },
            ],
        }
    }

    #[test]
    fn empty_payload_decodes_to_defaults() {
        let entries = entries_from_payload("").unwrap();

        assert!(entries.is_empty());
    }

    #[test]
    fn payloads_round_trip_order_and_flags() {
        for payload in [
            entries_payload(&sample_entries()).unwrap(),
            entries_snapshot_payload(&sample_entries()).unwrap(),
        ] {
            let decoded = entries_from_payload(&payload).unwrap();

            assert_eq!(2, decoded.entries.len());
            assert_eq!("home", decoded.entries[0].module_id);
            assert!(decoded.entries[0].enabled);
            assert_eq!("operations", decoded.entries[1].module_id);
            assert!(!decoded.entries[1].enabled);
        }
    }
}
