use std::collections::BTreeSet;
use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminModuleEntryFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

/// Module that hosts the admin module-entry configuration screen.
///
/// The screen edits the header module list, so disabling it would make the
/// configuration unreachable for every administrator. The service rejects a
/// stored preference that switches this module off.
pub const ADMIN_MODULE_MANAGEMENT_MODULE_ID: &str = "moduleManagement";

/// Upper bound on the ordered header entry list.
///
/// The header renders a bounded navigation strip, and a hostile client must not
/// be able to park an unbounded document in `ops_config_snapshot` that every
/// admin page load then decodes.
pub const MAX_ADMIN_MODULE_ENTRIES: usize = 64;

/// Upper bound on a single module identifier (`membershipCenter` style ids).
pub const MAX_ADMIN_MODULE_ID_LEN: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminModuleEntrySubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

/// One ordered header module preference.
///
/// Array position is the display order; `enabled` is the header opt-in flag.
/// Modules that never appear in the stored list keep the navigation defaults
/// (enabled, registry order) so a newly shipped admin module needs no
/// migration.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminModuleEntry {
    pub module_id: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct AdminModuleEntries {
    pub entries: Vec<AdminModuleEntry>,
}

impl AdminModuleEntries {
    /// Trims identifiers, drops empty and duplicate rows (first wins), and caps
    /// the list at [`MAX_ADMIN_MODULE_ENTRIES`].
    #[must_use]
    pub fn normalized(mut self) -> Self {
        let mut seen = BTreeSet::new();
        let mut entries = Vec::with_capacity(self.entries.len());
        for mut entry in self.entries {
            entry.module_id = entry.module_id.trim().to_owned();
            if entry.module_id.is_empty() || !seen.insert(entry.module_id.clone()) {
                continue;
            }
            entries.push(entry);
            if entries.len() == MAX_ADMIN_MODULE_ENTRIES {
                break;
            }
        }
        self.entries = entries;
        self
    }

    /// Rejects documents the admin surface cannot represent.
    ///
    /// # Errors
    ///
    /// Returns a human readable reason when an identifier is malformed, longer
    /// than the contract allows, duplicated, or when the module-management
    /// module itself is switched off.
    pub fn validate(&self) -> Result<(), String> {
        if self.entries.len() > MAX_ADMIN_MODULE_ENTRIES {
            return Err(format!(
                "items must not exceed {MAX_ADMIN_MODULE_ENTRIES} entries"
            ));
        }
        let mut seen = BTreeSet::new();
        for entry in &self.entries {
            if !is_valid_module_id(&entry.module_id) {
                return Err(format!(
                    "items.moduleId must match ^[a-z][A-Za-z0-9]*$ and be at most {MAX_ADMIN_MODULE_ID_LEN} characters"
                ));
            }
            if !seen.insert(entry.module_id.as_str()) {
                return Err(format!(
                    "items must not repeat moduleId `{}`",
                    entry.module_id
                ));
            }
            if entry.module_id == ADMIN_MODULE_MANAGEMENT_MODULE_ID && !entry.enabled {
                return Err(format!(
                    "moduleId `{ADMIN_MODULE_MANAGEMENT_MODULE_ID}` must stay enabled"
                ));
            }
        }
        Ok(())
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GetAdminModuleEntriesQuery {
    pub subject: AdminModuleEntrySubject,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminModuleEntriesCommand {
    pub subject: AdminModuleEntrySubject,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub entries: AdminModuleEntries,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminModuleEntryStore {
    fn get_admin_module_entries<'a>(
        &'a self,
        query: GetAdminModuleEntriesQuery,
    ) -> AdminModuleEntryFuture<'a, AdminModuleEntries>;

    fn update_admin_module_entries<'a>(
        &'a self,
        command: UpdateAdminModuleEntriesCommand,
    ) -> AdminModuleEntryFuture<'a, AdminModuleEntries>;
}

/// Module ids are lower-camel tokens (`home`, `iam`, `membershipCenter`,
/// `operations`) so the value is stable on the wire and safe inside the
/// navigation registry.
fn is_valid_module_id(value: &str) -> bool {
    if value.is_empty() || value.chars().count() > MAX_ADMIN_MODULE_ID_LEN {
        return false;
    }
    let mut chars = value.chars();
    match chars.next() {
        Some(first) if first.is_ascii_lowercase() => {}
        _ => return false,
    }
    chars.all(|ch| ch.is_ascii_alphanumeric())
}

#[cfg(test)]
mod tests {
    use super::{
        AdminModuleEntries, AdminModuleEntry, ADMIN_MODULE_MANAGEMENT_MODULE_ID,
        MAX_ADMIN_MODULE_ENTRIES,
    };

    fn entry(module_id: &str, enabled: bool) -> AdminModuleEntry {
        AdminModuleEntry {
            module_id: module_id.to_owned(),
            enabled,
        }
    }

    #[test]
    fn normalization_trims_and_drops_duplicates() {
        let entries = AdminModuleEntries {
            entries: vec![
                entry(" home ", true),
                entry("home", false),
                entry("", true),
                entry("operations", false),
            ],
        }
        .normalized();

        assert_eq!(2, entries.entries.len());
        assert_eq!("home", entries.entries[0].module_id);
        assert!(entries.entries[0].enabled);
        assert_eq!("operations", entries.entries[1].module_id);
    }

    #[test]
    fn normalization_caps_the_entry_list() {
        let entries = AdminModuleEntries {
            entries: (0..(MAX_ADMIN_MODULE_ENTRIES + 10))
                .map(|index| entry(&format!("module{index}"), true))
                .collect(),
        }
        .normalized();

        assert_eq!(MAX_ADMIN_MODULE_ENTRIES, entries.entries.len());
    }

    #[test]
    fn validation_rejects_invalid_and_duplicate_ids() {
        assert!(AdminModuleEntries {
            entries: vec![entry("Module", true)],
        }
        .validate()
        .is_err());
        assert!(AdminModuleEntries {
            entries: vec![entry("home", true), entry("home", true)],
        }
        .validate()
        .is_err());
    }

    #[test]
    fn validation_keeps_module_management_enabled() {
        assert!(AdminModuleEntries {
            entries: vec![entry(ADMIN_MODULE_MANAGEMENT_MODULE_ID, false)],
        }
        .validate()
        .is_err());
        assert!(AdminModuleEntries {
            entries: vec![entry(ADMIN_MODULE_MANAGEMENT_MODULE_ID, true)],
        }
        .validate()
        .is_ok());
    }
}
