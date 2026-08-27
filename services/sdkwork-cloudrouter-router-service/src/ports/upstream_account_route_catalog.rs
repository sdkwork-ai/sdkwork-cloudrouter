use std::sync::Arc;

use crate::domain::UpstreamAccountRoute;
use crate::ports::AdminLlmProtocolConfig;

use super::PricingCatalog;

/// 账号级 Base URL 配置快照：账号覆盖（默认 + 各协议）与供应商协议 URL。
/// 运行时按「账号配置 > 供应商配置 > 端点」的优先级解析调用地址：
/// - LLM（协议 P）：account.protocols[P] → account.default → supplier.protocols[P] → 端点解析结果
/// - 非 LLM / 无协议：account.default → supplier.default → 端点解析结果
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct AccountBaseUrlConfig {
    pub account_default_base_url: Option<String>,
    pub account_protocol_base_urls: Vec<AdminLlmProtocolConfig>,
    pub supplier_protocol_base_urls: Vec<AdminLlmProtocolConfig>,
}

/// Cumulative per-gate account counts describing why
/// `load_upstream_account_routes` returned no rows.
///
/// Each count follows the same dependency chain as the snapshot load SQL and
/// is cumulative: an account must pass every preceding gate to be counted in
/// a later one. The first count that drops below its predecessor marks the
/// gate blocking the whole pool (most often: zero active credentials).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UpstreamRouteGateDiagnosis {
    pub enabled_suppliers: i64,
    pub enabled_accounts: i64,
    pub auth_method_matched_accounts: i64,
    pub active_credential_accounts: i64,
    pub group_member_accounts: i64,
    pub base_url_resolvable_accounts: i64,
}

impl UpstreamRouteGateDiagnosis {
    /// `(label, count)` pairs in gate order, matching the load-SQL join chain.
    pub fn gates(&self) -> [(&'static str, i64); 6] {
        [
            ("enabled_suppliers", self.enabled_suppliers),
            ("enabled_accounts", self.enabled_accounts),
            ("auth_method_matches", self.auth_method_matched_accounts),
            ("active_credentials", self.active_credential_accounts),
            ("group_members", self.group_member_accounts),
            ("base_url_resolvable", self.base_url_resolvable_accounts),
        ]
    }

    /// First gate whose count reaches zero after a non-zero predecessor, plus
    /// the operator-facing remediation hint for it. `None` means no single
    /// gate explains the empty pool (either everything is zero — nothing was
    /// configured at all — or every gate passes, which points at a data
    /// inconsistency worth escalating).
    pub fn blocking_gate(&self) -> Option<(&'static str, &'static str)> {
        let mut previous_count: Option<i64> = None;
        for (label, count) in self.gates() {
            let blocked_by_this_gate = count == 0 && previous_count.is_some_and(|c| c > 0);
            if blocked_by_this_gate {
                return Some((label, Self::hint_for(label)));
            }
            if count == 0 {
                return None;
            }
            previous_count = Some(count);
        }
        None
    }

    /// Compact operator-facing summary appended to the empty-snapshot error.
    pub fn summary(&self) -> String {
        let chain = self
            .gates()
            .iter()
            .map(|(label, count)| format!("{label}={count}"))
            .collect::<Vec<_>>()
            .join(", ");
        match self.blocking_gate() {
            Some((label, hint)) => {
                format!("routing account-pool gates [{chain}] block at '{label}'; {hint}")
            }
            // No single blocking gate: report the raw chain without a cache
            // hint so operators investigate data/SQL consistency instead.
            None => format!("routing account-pool gates [{chain}]"),
        }
    }

    fn hint_for(label: &str) -> &'static str {
        match label {
            "enabled_suppliers" => "enable an upstream supplier (status=1) that can serve requests",
            "enabled_accounts" => "create or enable an upstream account under an enabled supplier",
            "auth_method_matches" => {
                "enable a matching auth method on the supplier \
                 (account.auth_method_code must equal an enabled supplier auth method)"
            }
            "active_credentials" => {
                "create an active credential for the upstream account \
                 (non-expiring or valid expiresAt, non-blank secret)"
            }
            "group_members" => {
                "add the account to an account group as an enabled member \
                 within its effective period"
            }
            "base_url_resolvable" => {
                "configure a base_url via an enabled endpoint, the supplier \
                 default/protocols, or the account default/protocols"
            }
            _ => "inspect the routing catalog configuration",
        }
    }
}

/// One vendor + model list entry of an account group's model access rule:
/// `vendor_code` is the model vendor, `models` are the model names (an empty
/// list means every model of the vendor).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VendorModelListEntry {
    pub vendor_code: String,
    pub models: Vec<String>,
}

/// Group-level model access control loaded from `ai_model_access_policy`
/// (`scope_type = 'account_group'`; `deny` rows aggregate to `blacklist`,
/// `allow` rows to `whitelist`). The blacklist forbids the whole group from
/// serving matching models; the whitelist (when non-empty) restricts the
/// group to matching models only. The blacklist wins over the whitelist.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountGroupModelAccess {
    pub group_id: i64,
    pub blacklist: Vec<VendorModelListEntry>,
    pub whitelist: Vec<VendorModelListEntry>,
}

/// Supplier-level model access control loaded from `ai_model_access_policy`
/// (`scope_type = 'supplier'`; `deny` rows → `blacklist`, `allow` rows →
/// `whitelist`). Same shape and semantics as the group level, scoped to the
/// supplier: models denied for the supplier cannot be routed through any of
/// its accounts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SupplierModelAccess {
    pub supplier_code: String,
    pub blacklist: Vec<VendorModelListEntry>,
    pub whitelist: Vec<VendorModelListEntry>,
}

/// Account-level model access control loaded from `ai_model_access_policy`
/// (`scope_type = 'account'`; `deny` rows → `blacklist`, `allow` rows →
/// `whitelist`). Same shape and semantics as the group/supplier levels, scoped
/// to the single upstream account: models denied for the account cannot be
/// served by it even when the group and supplier allow them.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountModelAccess {
    pub account_id: i64,
    pub blacklist: Vec<VendorModelListEntry>,
    pub whitelist: Vec<VendorModelListEntry>,
}

pub trait UpstreamAccountRouteCatalog: PricingCatalog {
    fn shared_upstream_account_routes(&self) -> Arc<[UpstreamAccountRoute]>;

    /// Returns the per-gate account-pool diagnosis captured while loading the
    /// snapshot when zero upstream account routes were loaded, so selection
    /// errors can state exactly which configuration gate blocks the pool.
    /// `None` when the pool is non-empty (no diagnosis needed) or the
    /// implementation does not capture one.
    fn upstream_route_gate_diagnosis(&self) -> Option<UpstreamRouteGateDiagnosis> {
        None
    }

    /// Returns the model blacklist/whitelist configured for the account group,
    /// or `None` when the group has no model access restriction configured.
    fn account_group_model_access(&self, group_id: i64) -> Option<AccountGroupModelAccess> {
        let _ = group_id;
        None
    }

    /// Returns the model blacklist/whitelist configured for the upstream
    /// supplier, or `None` when the supplier has no model access restriction.
    fn supplier_model_access(&self, supplier_code: &str) -> Option<SupplierModelAccess> {
        let _ = supplier_code;
        None
    }

    /// Returns the model blacklist/whitelist configured for the upstream
    /// account, or `None` when the account has no model access restriction.
    fn account_model_access(&self, account_id: i64) -> Option<AccountModelAccess> {
        let _ = account_id;
        None
    }

    /// Returns the supplier-level default Base URL used when an invocation
    /// resource (e.g. image, video, audio APIs) does not match any configured
    /// LLM API protocol endpoint. `None` when the supplier declares none.
    fn supplier_default_base_url(&self, supplier_code: &str) -> Option<String> {
        let _ = supplier_code;
        None
    }

    /// Returns the account-level Base URL configuration (account default +
    /// per-protocol overrides, plus the supplier per-protocol URLs) used to
    /// resolve the callable Base URL with account-first priority. `None` when
    /// the account declares neither overrides nor supplier protocol URLs.
    fn account_base_url_config(&self, account_id: i64) -> Option<AccountBaseUrlConfig> {
        let _ = account_id;
        None
    }

    /// Returns the account-level billing mode code (`"prepay"` / `"postpay"`).
    /// `None` means the caller falls back to prepay (default).
    fn account_billing_mode(&self, _account_id: i64) -> Option<String> {
        None
    }

    /// 按模型名（catalog key 或展示名，精确匹配）解析可能的 catalog key 列表。
    /// 索引实现为 O(1)；默认实现线性扫描回退（兼容非索引实现）。
    /// 空列表 = 未知模型；多于一个 = 歧义。
    fn model_catalog_keys_by_name(&self, model_name: &str) -> Vec<String> {
        let mut keys = Vec::new();
        self.visit_models(None, &mut |model| {
            if model.catalog_key == model_name || model.model == model_name {
                if !keys.contains(&model.catalog_key) {
                    keys.push(model.catalog_key.clone());
                }
            }
            true
        });
        keys
    }

    /// 按模型名解析**支持该模型的所有 vendor 代码**（去重、保序）。
    ///
    /// 对应模型类路由流程第 2 步"根据模型通过 sdkwork-models 解析出支持该
    /// 模型的 vendor 列表"。一个模型名可能被多个 vendor 提供（catalog key
    /// 不同），返回这些 vendor 的并集，供后续 supplier 收敛（supplier 通过
    /// `ai_resource_binding` 声明自持资源）使用。
    fn model_vendor_codes_by_name(&self, model_name: &str) -> Vec<String> {
        let mut vendors = Vec::new();
        self.visit_models(None, &mut |model| {
            let name_matches = model.catalog_key == model_name || model.model == model_name;
            let key_matches = model.catalog_key.starts_with(&format!("{model_name}/"))
                || model.model == model_name;
            if (name_matches || key_matches) && !vendors.contains(&model.vendor_code) {
                vendors.push(model.vendor_code.clone());
            }
            true
        });
        vendors
    }

    /// 解析资源的**持久化路由类型**（`ai_resource.route_kind`）。
    ///
    /// 对应模型/API 资源类路由流程第 1 步：资源管理显式标记了 `route_kind`
    /// （`model` 或 `api`）时，路由决策必须以它为准，覆盖运行时按表面推导
    /// 的结果。实现扫描全部账号路由的 `resource_entitlements`，按
    /// `resource_code`/`api_code`/`catalog_key` 精确匹配归一化后的 route key，
    /// 命中显式标记即返回。未命中或无标记返回 `None`。
    fn resource_route_kind(&self, route_key: &str, api_code: &str) -> Option<String> {
        let normalized_route_key = normalize_resource_key(route_key);
        let normalized_api_code = api_code.trim().to_owned();
        for route in self.shared_upstream_account_routes().iter() {
            for binding in route.account_group_bindings.iter() {
                let Some(entitlements) = binding.resource_entitlements.as_ref() else {
                    continue;
                };
                for entitlement in entitlements.iter() {
                    let entitlement_code = entitlement.resource_code.trim();
                    let matches_code = entitlement_code == normalized_route_key
                        || (normalized_route_key.is_empty()
                            && entitlement_code == normalized_api_code)
                        || (entitlement.api_code.as_deref().map(str::trim)
                            == Some(&normalized_api_code))
                        || (normalized_api_code.is_empty()
                            && entitlement.api_code.as_deref().map(str::trim)
                                == Some(&normalized_route_key));
                    if matches_code {
                        if let Some(kind) = entitlement.route_kind.as_deref() {
                            return Some(kind.to_owned());
                        }
                    }
                }
            }
        }
        None
    }
}

/// 将资源路径归一化为 resource_code 匹配键（与分类器 `normalize_key` 同构）：
/// 去前后斜杠、小写、把 `/` `:` `-` 替换为 `.`。空输入保持空。
fn normalize_resource_key(value: &str) -> String {
    value
        .trim()
        .trim_matches('/')
        .to_ascii_lowercase()
        .replace(['/', ':', '-'], ".")
        .trim_matches('.')
        .to_owned()
}

#[cfg(test)]
mod tests {
    use super::UpstreamRouteGateDiagnosis;

    #[test]
    fn diagnosis_blocks_at_the_first_zero_after_a_nonzero_prefix() {
        // Everything configured except credentials (the historically most
        // common deployment gap) must name the credential gate.
        let diagnosis = UpstreamRouteGateDiagnosis {
            enabled_suppliers: 1,
            enabled_accounts: 2,
            auth_method_matched_accounts: 2,
            active_credential_accounts: 0,
            group_member_accounts: 0,
            base_url_resolvable_accounts: 0,
        };
        let (label, hint) = diagnosis.blocking_gate().unwrap();
        assert_eq!("active_credentials", label);
        assert!(hint.contains("credential"));
        assert!(diagnosis.summary().contains("active_credentials=0"));
    }

    #[test]
    fn diagnosis_without_any_configuration_has_no_single_blocker() {
        let diagnosis = UpstreamRouteGateDiagnosis {
            enabled_suppliers: 0,
            enabled_accounts: 0,
            auth_method_matched_accounts: 0,
            active_credential_accounts: 0,
            group_member_accounts: 0,
            base_url_resolvable_accounts: 0,
        };
        assert!(diagnosis.blocking_gate().is_none());
        // Still prints the raw chain for operators.
        assert!(diagnosis.summary().contains("enabled_suppliers=0"));
        // ...and must NOT blame the routing cache.
        assert!(!diagnosis.summary().contains("cache"));
    }

    #[test]
    fn diagnosis_reports_group_membership_as_blocking_gate() {
        let diagnosis = UpstreamRouteGateDiagnosis {
            enabled_suppliers: 1,
            enabled_accounts: 1,
            auth_method_matched_accounts: 1,
            active_credential_accounts: 1,
            group_member_accounts: 0,
            base_url_resolvable_accounts: 0,
        };
        assert_eq!(
            Some("group_members"),
            diagnosis.blocking_gate().map(|(l, _)| l)
        );
        assert!(diagnosis
            .blocking_gate()
            .is_some_and(|(_, hint)| hint.contains("account group")));
    }

    #[test]
    fn fully_satisfied_gates_report_no_blocker() {
        let diagnosis = UpstreamRouteGateDiagnosis {
            enabled_suppliers: 1,
            enabled_accounts: 3,
            auth_method_matched_accounts: 2,
            active_credential_accounts: 2,
            group_member_accounts: 2,
            base_url_resolvable_accounts: 2,
        };
        assert!(diagnosis.blocking_gate().is_none());
    }
}
