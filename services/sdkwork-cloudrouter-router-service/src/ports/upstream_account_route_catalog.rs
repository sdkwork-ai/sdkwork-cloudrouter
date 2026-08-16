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

/// One vendor + model list entry of an account group's model access rule:
/// `vendor_code` is the model vendor, `models` are the model names (an empty
/// list means every model of the vendor).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VendorModelListEntry {
    pub vendor_code: String,
    pub models: Vec<String>,
}

/// Group-level model access control loaded from `ai_upstream_account_group`
/// `model_blacklist` / `model_whitelist`. The blacklist forbids the whole
/// group from serving matching models; the whitelist (when non-empty)
/// restricts the group to matching models only. The blacklist wins over the
/// whitelist.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountGroupModelAccess {
    pub group_id: i64,
    pub blacklist: Vec<VendorModelListEntry>,
    pub whitelist: Vec<VendorModelListEntry>,
}

/// Supplier-level model access control loaded from `ai_upstream_supplier`
/// `model_blacklist` / `model_whitelist` (同分组级结构与语义，按供应商生效：
/// 命中供应商黑名单的模型不可经该供应商的任何账号路由)。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SupplierModelAccess {
    pub supplier_code: String,
    pub blacklist: Vec<VendorModelListEntry>,
    pub whitelist: Vec<VendorModelListEntry>,
}

pub trait UpstreamAccountRouteCatalog: PricingCatalog {
    fn shared_upstream_account_routes(&self) -> Arc<[UpstreamAccountRoute]>;

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
}
