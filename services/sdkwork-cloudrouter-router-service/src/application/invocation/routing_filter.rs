//! 路由过滤链（Candidate Filter Chain）：候选账号从「路由规划产出」到
//! 「最终账号」的过滤框架。
//!
//! 每个过滤器组件负责一个过滤阶段（黑白名单门禁、健康、可调用性等），
//! 按序执行，任一阶段可短路拒绝（如模型被黑白名单禁止），最终产出
//! 最终账号与故障转移序列。过滤链在账号解析阶段统一执行，确保模型
//! 路由与账号路由（含 provider-native）两条路径走同一套门禁。
//!
//! 编排职责划分：
//! - 规划阶段（selector / planner）：候选生成、排序（权重/轮询/策略）、
//!   fallback 截断、熔断许可（拦截器层）。
//! - 过滤链阶段（本模块）：黑白名单、健康、可调用性等防护性过滤。

use std::collections::HashMap;
use std::fmt;

use crate::application::{
    model_access_forbidden_message, model_access_forbidden_reason,
    model_access_forbidden_reason_lists,
};
use crate::ports::UpstreamAccountRouteCatalog;

use super::{InvocationRouteCandidate, InvocationRouteCandidateKind};

/// 过滤链上下文：请求级一次提取，链内各过滤器共享，避免重复查询。
pub struct RoutingFilterContext<'a> {
    pub catalog: &'a dyn UpstreamAccountRouteCatalog,
    /// 租户（日志/追踪）
    pub tenant_id: i64,
    /// 请求的模型名（模型路由/provider-native 均可能携带）
    pub requested_model: Option<&'a str>,
    /// 请求模型对应的 vendor code（一次提取；catalog key 已在规划阶段解析）
    pub requested_model_vendor_code: Option<String>,
    /// account_id -> 是否健康（请求级一次提取自共享路由）
    pub account_health: HashMap<i64, bool>,
}

/// 过滤决策：继续（携带过滤后的候选）或拒绝（短路）。
pub enum FilterDecision {
    Continue(Vec<InvocationRouteCandidate>),
    Reject(FilterRejection),
}

/// 拒绝原因：保留错误码语义（模型禁止 / 路由不可用）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FilterRejectionKind {
    ModelForbidden,
    RouteUnavailable,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FilterRejection {
    pub kind: FilterRejectionKind,
    pub message: String,
}

impl fmt::Display for FilterRejection {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

/// 过滤器组件：单一职责，纯函数式候选变换，独立可单测。
pub trait CandidateFilter: Send + Sync {
    fn name(&self) -> &'static str;

    fn apply(
        &self,
        ctx: &RoutingFilterContext<'_>,
        candidates: Vec<InvocationRouteCandidate>,
    ) -> FilterDecision;
}

/// 模型黑白名单门禁：候选所属分组或供应商禁止该模型（黑名单命中或白名单
/// 未覆盖）时硬拒绝（ModelForbidden）。所有路由路径统一执行，黑名单优先
/// 于白名单；供应商级与分组级任一命中即拒绝。
pub struct ModelAccessFilter;

impl CandidateFilter for ModelAccessFilter {
    fn name(&self) -> &'static str {
        "model_access"
    }

    fn apply(
        &self,
        ctx: &RoutingFilterContext<'_>,
        candidates: Vec<InvocationRouteCandidate>,
    ) -> FilterDecision {
        let Some(requested_model) = ctx.requested_model else {
            return FilterDecision::Continue(candidates);
        };
        let vendor_code = ctx.requested_model_vendor_code.as_deref();
        for candidate in &candidates {
            // 分组级黑白名单
            if let Some(group_id) = candidate.account_group_id {
                if let Some(access) = ctx.catalog.account_group_model_access(group_id) {
                    if let Some(rule) =
                        model_access_forbidden_reason(vendor_code, requested_model, &access)
                    {
                        let group_code = match candidate.account_group_code.as_deref() {
                            Some(code) => code.to_owned(),
                            None => group_id.to_string(),
                        };
                        return FilterDecision::Reject(FilterRejection {
                            kind: FilterRejectionKind::ModelForbidden,
                            message: model_access_forbidden_message(
                                rule,
                                requested_model,
                                &group_code,
                            ),
                        });
                    }
                }
            }
            // 供应商级黑白名单（管理端配置与路由执行一致）
            if let Some(access) = ctx
                .catalog
                .supplier_model_access(candidate.supplier_code.trim())
            {
                if let Some(rule) = model_access_forbidden_reason_lists(
                    vendor_code,
                    requested_model,
                    &access.blacklist,
                    &access.whitelist,
                ) {
                    let message = match rule {
                        "blacklist" => format!(
                            "model {requested_model} is forbidden by upstream supplier {} (model blacklist)",
                            candidate.supplier_code
                        ),
                        _ => format!(
                            "model {requested_model} is not allowed by upstream supplier {} (model whitelist)",
                            candidate.supplier_code
                        ),
                    };
                    return FilterDecision::Reject(FilterRejection {
                        kind: FilterRejectionKind::ModelForbidden,
                        message,
                    });
                }
            }
            // 账号级黑白名单（supplier 与 account 各自配置，任一命中即拒绝；
            // 粒度：account > supplier > group）
            if let Some(access) = ctx.catalog.account_model_access(candidate.account_id) {
                if let Some(rule) = model_access_forbidden_reason_lists(
                    vendor_code,
                    requested_model,
                    &access.blacklist,
                    &access.whitelist,
                ) {
                    let message = match rule {
                        "blacklist" => format!(
                            "model {requested_model} is forbidden by upstream account {} (model blacklist)",
                            candidate.account_id
                        ),
                        _ => format!(
                            "model {requested_model} is not allowed by upstream account {} (model whitelist)",
                            candidate.account_id
                        ),
                    };
                    return FilterDecision::Reject(FilterRejection {
                        kind: FilterRejectionKind::ModelForbidden,
                        message,
                    });
                }
            }
        }
        FilterDecision::Continue(candidates)
    }
}

/// 账号健康过滤：剔除健康快照中标记为不健康的账号（快照缺失视为健康，
/// 防御性过滤，规划阶段已做主要筛选；sticky 候选同样受此约束）。
pub struct HealthFilter;

impl CandidateFilter for HealthFilter {
    fn name(&self) -> &'static str {
        "account_health"
    }

    fn apply(
        &self,
        ctx: &RoutingFilterContext<'_>,
        candidates: Vec<InvocationRouteCandidate>,
    ) -> FilterDecision {
        let mut unhealthy_ids: Vec<i64> = Vec::new();
        let healthy: Vec<_> = candidates
            .into_iter()
            .filter(|candidate| {
                let is_healthy = ctx
                    .account_health
                    .get(&candidate.account_id)
                    .copied()
                    .unwrap_or(true);
                if !is_healthy {
                    unhealthy_ids.push(candidate.account_id);
                }
                is_healthy
            })
            .collect();
        if !unhealthy_ids.is_empty() {
            tracing::warn!(
                tenant_id = ctx.tenant_id,
                model = ctx.requested_model,
                removed_count = unhealthy_ids.len(),
                remaining_count = healthy.len(),
                ?unhealthy_ids,
                "health filter removed unhealthy upstream accounts"
            );
        }
        FilterDecision::Continue(healthy)
    }
}

/// 可调用性过滤：剔除缺少 base URL 或认证信息的候选
/// （与规划阶段的 callable 判定一致，防御路由后置变化）。
pub struct EntitlementFilter;

impl CandidateFilter for EntitlementFilter {
    fn name(&self) -> &'static str {
        "account_callable"
    }

    fn apply(
        &self,
        ctx: &RoutingFilterContext<'_>,
        candidates: Vec<InvocationRouteCandidate>,
    ) -> FilterDecision {
        let mut not_callable: Vec<(i64, &'static str)> = Vec::new();
        let callable: Vec<_> = candidates
            .into_iter()
            .filter(|candidate| {
                if candidate_is_callable(candidate) {
                    return true;
                }
                let reason = if candidate.supplier_code.trim().is_empty() {
                    "missing supplier_code"
                } else if candidate.account_id <= 0 {
                    "invalid account_id"
                } else if candidate
                    .base_url
                    .as_deref()
                    .unwrap_or("")
                    .trim()
                    .is_empty()
                {
                    "missing base_url"
                } else {
                    "missing secret_ref and no default_headers"
                };
                not_callable.push((candidate.account_id, reason));
                false
            })
            .collect();
        if !not_callable.is_empty() {
            tracing::warn!(
                tenant_id = ctx.tenant_id,
                model = ctx.requested_model,
                removed_count = not_callable.len(),
                remaining_count = callable.len(),
                not_callable = ?not_callable,
                "entitlement filter removed non-callable upstream accounts"
            );
        }
        FilterDecision::Continue(callable)
    }
}

/// sticky 候选再校验：sticky 目标必须是可调用账号（健康与黑白名单由
/// 后续过滤器统一执行）。
pub struct StickyRouteFilter;

impl CandidateFilter for StickyRouteFilter {
    fn name(&self) -> &'static str {
        "sticky_route"
    }

    fn apply(
        &self,
        _ctx: &RoutingFilterContext<'_>,
        candidates: Vec<InvocationRouteCandidate>,
    ) -> FilterDecision {
        for candidate in &candidates {
            if candidate.kind == InvocationRouteCandidateKind::Sticky
                && !candidate_is_callable(candidate)
            {
                return FilterDecision::Reject(FilterRejection {
                    kind: FilterRejectionKind::RouteUnavailable,
                    message: "sticky upstream account is not callable".to_owned(),
                });
            }
        }
        FilterDecision::Continue(candidates)
    }
}

/// 过滤链：按序执行过滤器；短路拒绝；产出最终账号与故障转移序列。
pub struct RoutingFilterChain {
    filters: Vec<Box<dyn CandidateFilter>>,
}

/// 链的选择结果：最终账号 + 剩余故障转移序列（供 dispatch 的 failover 使用）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedRoute {
    pub account: InvocationRouteCandidate,
    pub failover_candidates: Vec<InvocationRouteCandidate>,
}

impl Default for RoutingFilterChain {
    fn default() -> Self {
        Self::new()
    }
}

impl RoutingFilterChain {
    pub fn new() -> Self {
        Self {
            filters: vec![
                Box::new(ModelAccessFilter),
                Box::new(HealthFilter),
                Box::new(EntitlementFilter),
                Box::new(StickyRouteFilter),
            ],
        }
    }

    /// 自定义过滤器列表，供模块测试验证过滤顺序和短路行为。
    #[cfg(test)]
    pub fn with_filters(filters: Vec<Box<dyn CandidateFilter>>) -> Self {
        Self { filters }
    }

    #[cfg(test)]
    pub fn filters(&self) -> &[Box<dyn CandidateFilter>] {
        &self.filters
    }

    /// 依次执行过滤器；任一拒绝即短路（记录拒绝过滤器名，便于追踪
    /// 路由决策）；候选耗尽视为路由不可用；否则取首个为最终账号，
    /// 其余保留为故障转移序列。
    pub fn select_account(
        &self,
        ctx: &RoutingFilterContext<'_>,
        candidates: Vec<InvocationRouteCandidate>,
    ) -> Result<SelectedRoute, FilterRejection> {
        let initial_count = candidates.len();
        let mut current = candidates;
        let mut eliminating_filter: Option<&str> = None;
        let mut count_before_elimination = 0usize;
        for filter in &self.filters {
            let before = current.len();
            match filter.apply(ctx, current) {
                FilterDecision::Continue(next) => {
                    let after = next.len();
                    if after < before {
                        tracing::debug!(
                            tenant_id = ctx.tenant_id,
                            filter = filter.name(),
                            candidates_before = before,
                            candidates_after = after,
                            "route filter reduced candidate set"
                        );
                    }
                    if after == 0 && before > 0 && eliminating_filter.is_none() {
                        eliminating_filter = Some(filter.name());
                        count_before_elimination = before;
                    }
                    current = next;
                }
                FilterDecision::Reject(rejection) => {
                    tracing::debug!(
                        tenant_id = ctx.tenant_id,
                        filter = filter.name(),
                        kind = ?rejection.kind,
                        "route filter rejected candidates"
                    );
                    return Err(rejection);
                }
            }
        }
        let mut iter = current.into_iter();
        let account = iter.next().ok_or_else(|| {
            let message = if let Some(filter) = eliminating_filter {
                format!(
                    "no callable upstream account remains after routing filters \
                     (filter '{filter}' eliminated all {count_before_elimination} \
                     remaining candidates out of {initial_count} initial; \
                     model={model})",
                    model = ctx.requested_model.unwrap_or("<none>")
                )
            } else {
                format!(
                    "no callable upstream account remains after routing filters \
                     (started with {initial_count} candidates, all were eliminated; \
                     model={model})",
                    model = ctx.requested_model.unwrap_or("<none>")
                )
            };
            FilterRejection {
                kind: FilterRejectionKind::RouteUnavailable,
                message,
            }
        })?;
        Ok(SelectedRoute {
            account,
            failover_candidates: iter.collect(),
        })
    }
}

fn candidate_is_callable(candidate: &InvocationRouteCandidate) -> bool {
    !candidate.supplier_code.trim().is_empty()
        && candidate.account_id > 0
        && !candidate
            .base_url
            .as_deref()
            .unwrap_or("")
            .trim()
            .is_empty()
        && (!candidate
            .secret_ref
            .as_deref()
            .unwrap_or("")
            .trim()
            .is_empty()
            || !candidate.auth_profile.default_headers.is_empty())
}

/// 构建请求级过滤上下文：一次提取模型 vendor code 与账号健康表。
pub fn routing_filter_context<'a>(
    catalog: &'a dyn UpstreamAccountRouteCatalog,
    tenant_id: i64,
    requested_model: Option<&'a str>,
    requested_model_catalog_key: Option<&'a str>,
) -> RoutingFilterContext<'a> {
    let requested_model_vendor_code = requested_model_catalog_key
        .and_then(|key| catalog.find_model(key))
        .map(|model| model.vendor_code);
    let mut account_health = HashMap::new();
    for route in catalog.shared_upstream_account_routes().iter() {
        account_health.insert(route.account_id, route.is_account_healthy());
    }
    RoutingFilterContext {
        catalog,
        tenant_id,
        requested_model,
        requested_model_vendor_code,
        account_health,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::invocation::{AccountBillingMode, InvocationRouteCandidateKind};
    use crate::domain::ProviderAuthProfile;
    use crate::infrastructure::InMemoryPricingCatalog;

    fn test_catalog() -> InMemoryPricingCatalog {
        InMemoryPricingCatalog::default()
    }

    fn candidate(
        account_id: i64,
        group_id: Option<i64>,
        kind: InvocationRouteCandidateKind,
    ) -> InvocationRouteCandidate {
        InvocationRouteCandidate {
            kind,
            supplier_code: "openai".to_owned(),
            account_id,
            account_group_id: group_id,
            account_group_code: group_id.map(|id| format!("group-{id}")),
            pricing_plan_code: None,
            api_code: "chat.completions".to_owned(),
            catalog_key: Some("openai/gpt-4".to_owned()),
            requested_model: Some("gpt-4".to_owned()),
            provider_model: Some("gpt-4".to_owned()),
            region_code: "global".to_owned(),
            credential_id: Some(1),
            credential_rotation: None,
            base_url: Some("https://api.openai.com/v1".to_owned()),
            secret_ref: Some("secret-1".to_owned()),
            auth_profile: ProviderAuthProfile::default(),
            timeout_ms: Some(30_000),
            retry_policy: None,
            billing_mode: AccountBillingMode::Prepay,
        }
    }

    fn ctx(catalog: &InMemoryPricingCatalog) -> RoutingFilterContext<'_> {
        RoutingFilterContext {
            catalog,
            tenant_id: 10,
            requested_model: Some("gpt-4"),
            requested_model_vendor_code: None,
            account_health: HashMap::new(),
        }
    }

    #[test]
    fn selects_first_unrestricted_candidate() {
        let catalog = test_catalog();
        let chain = RoutingFilterChain::new();
        let result = chain
            .select_account(
                &ctx(&catalog),
                vec![candidate(1, None, InvocationRouteCandidateKind::Model)],
            )
            .expect("unrestricted candidate selected");
        assert_eq!(result.account.account_id, 1);
        assert!(result.failover_candidates.is_empty());
    }

    #[test]
    fn empty_candidates_yield_route_unavailable() {
        let catalog = test_catalog();
        let chain = RoutingFilterChain::new();
        let rejection = chain
            .select_account(&ctx(&catalog), vec![])
            .expect_err("no candidates");
        assert_eq!(rejection.kind, FilterRejectionKind::RouteUnavailable);
    }

    #[test]
    fn model_blacklist_rejects_forbidden_group() {
        use crate::ports::{AccountGroupModelAccess, VendorModelListEntry};
        let mut catalog = test_catalog();
        catalog.set_account_group_model_access(AccountGroupModelAccess {
            group_id: 7,
            blacklist: vec![VendorModelListEntry {
                vendor_code: "openai".to_owned(),
                models: vec!["gpt-4".to_owned()],
            }],
            whitelist: Vec::new(),
        });
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model_vendor_code = Some("openai".to_owned());
        let rejection = chain
            .select_account(
                &context,
                vec![candidate(1, Some(7), InvocationRouteCandidateKind::Model)],
            )
            .expect_err("blacklisted model rejected");
        assert_eq!(rejection.kind, FilterRejectionKind::ModelForbidden);
        assert!(rejection.message.contains("model blacklist"));
    }

    #[test]
    fn model_whitelist_rejects_unlisted_model() {
        use crate::ports::{AccountGroupModelAccess, VendorModelListEntry};
        let mut catalog = test_catalog();
        catalog.set_account_group_model_access(AccountGroupModelAccess {
            group_id: 7,
            blacklist: Vec::new(),
            whitelist: vec![VendorModelListEntry {
                vendor_code: "openai".to_owned(),
                models: vec!["gpt-4o".to_owned()],
            }],
        });
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model_vendor_code = Some("openai".to_owned());
        let rejection = chain
            .select_account(
                &context,
                vec![candidate(1, Some(7), InvocationRouteCandidateKind::Model)],
            )
            .expect_err("model not in whitelist rejected");
        assert_eq!(rejection.kind, FilterRejectionKind::ModelForbidden);
        assert!(rejection.message.contains("model whitelist"));
    }

    #[test]
    fn health_filter_drops_unhealthy_accounts() {
        let catalog = test_catalog();
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model = None;
        context.account_health.insert(1, true);
        context.account_health.insert(2, false);
        let result = chain
            .select_account(
                &context,
                vec![
                    candidate(1, None, InvocationRouteCandidateKind::Model),
                    candidate(2, None, InvocationRouteCandidateKind::Model),
                ],
            )
            .expect("healthy account selected");
        assert_eq!(result.account.account_id, 1);
        assert!(result.failover_candidates.is_empty());
    }

    #[test]
    fn failover_sequence_preserves_remaining_candidates() {
        let catalog = test_catalog();
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model = None;
        let result = chain
            .select_account(
                &context,
                vec![
                    candidate(1, None, InvocationRouteCandidateKind::Model),
                    candidate(2, None, InvocationRouteCandidateKind::Model),
                    candidate(3, None, InvocationRouteCandidateKind::Model),
                ],
            )
            .expect("selected");
        assert_eq!(result.account.account_id, 1);
        assert_eq!(
            result
                .failover_candidates
                .iter()
                .map(|c| c.account_id)
                .collect::<Vec<_>>(),
            vec![2, 3]
        );
    }

    #[test]
    fn non_callable_candidates_are_filtered() {
        let catalog = test_catalog();
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model = None;
        let mut broken = candidate(9, None, InvocationRouteCandidateKind::Model);
        broken.base_url = None;
        let rejection = chain
            .select_account(&context, vec![broken])
            .expect_err("non-callable candidate rejected");
        assert_eq!(rejection.kind, FilterRejectionKind::RouteUnavailable);
    }

    #[test]
    fn sticky_candidate_must_be_callable() {
        let catalog = test_catalog();
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model = None;
        let mut sticky = candidate(1, None, InvocationRouteCandidateKind::Sticky);
        sticky.secret_ref = None;
        sticky.auth_profile = ProviderAuthProfile::default();
        let rejection = chain
            .select_account(&context, vec![sticky])
            .expect_err("non-callable sticky candidate rejected");
        assert_eq!(rejection.kind, FilterRejectionKind::RouteUnavailable);
    }

    #[test]
    fn supplier_blacklist_rejects_candidate_of_that_supplier() {
        use crate::ports::{SupplierModelAccess, VendorModelListEntry};
        let mut catalog = test_catalog();
        catalog.set_supplier_model_access(SupplierModelAccess {
            supplier_code: "openai".to_owned(),
            blacklist: vec![VendorModelListEntry {
                vendor_code: "openai".to_owned(),
                models: vec!["gpt-4".to_owned()],
            }],
            whitelist: Vec::new(),
        });
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model_vendor_code = Some("openai".to_owned());
        let rejection = chain
            .select_account(
                &context,
                vec![candidate(1, None, InvocationRouteCandidateKind::Model)],
            )
            .expect_err("supplier-blacklisted model rejected");
        assert_eq!(rejection.kind, FilterRejectionKind::ModelForbidden);
        assert!(rejection.message.contains("upstream supplier openai"));
    }

    /// 测试用过滤器：记录执行顺序
    struct RecordingFilter {
        name: &'static str,
        log: std::sync::Arc<std::sync::Mutex<Vec<&'static str>>>,
    }

    impl CandidateFilter for RecordingFilter {
        fn name(&self) -> &'static str {
            self.name
        }

        fn apply(
            &self,
            _ctx: &RoutingFilterContext<'_>,
            candidates: Vec<InvocationRouteCandidate>,
        ) -> FilterDecision {
            self.log.lock().unwrap().push(self.name);
            FilterDecision::Continue(candidates)
        }
    }

    /// 测试用过滤器：无条件拒绝
    struct RejectAllFilter;

    impl CandidateFilter for RejectAllFilter {
        fn name(&self) -> &'static str {
            "reject_all"
        }

        fn apply(
            &self,
            _ctx: &RoutingFilterContext<'_>,
            _candidates: Vec<InvocationRouteCandidate>,
        ) -> FilterDecision {
            FilterDecision::Reject(FilterRejection {
                kind: FilterRejectionKind::RouteUnavailable,
                message: "reject all (test)".to_owned(),
            })
        }
    }

    #[test]
    fn custom_filter_chain_executes_in_assembly_order() {
        let catalog = test_catalog();
        let log = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let chain = RoutingFilterChain::with_filters(vec![
            Box::new(RecordingFilter {
                name: "first",
                log: log.clone(),
            }),
            Box::new(RecordingFilter {
                name: "second",
                log: log.clone(),
            }),
        ]);
        let mut context = ctx(&catalog);
        context.requested_model = None;
        chain
            .select_account(
                &context,
                vec![candidate(1, None, InvocationRouteCandidateKind::Model)],
            )
            .expect("selected");
        assert_eq!(vec!["first", "second"], *log.lock().unwrap());
        assert_eq!(2, chain.filters().len());
    }

    #[test]
    fn custom_filter_chain_short_circuits_on_rejection() {
        let catalog = test_catalog();
        let log = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let chain = RoutingFilterChain::with_filters(vec![
            Box::new(RecordingFilter {
                name: "first",
                log: log.clone(),
            }),
            Box::new(RejectAllFilter),
            Box::new(RecordingFilter {
                name: "third",
                log: log.clone(),
            }),
        ]);
        let mut context = ctx(&catalog);
        context.requested_model = None;
        let rejection = chain
            .select_account(
                &context,
                vec![candidate(1, None, InvocationRouteCandidateKind::Model)],
            )
            .expect_err("rejected by second filter");
        assert_eq!(FilterRejectionKind::RouteUnavailable, rejection.kind);
        // 短路语义：拒绝后的过滤器不再执行
        assert_eq!(vec!["first"], *log.lock().unwrap());
    }

    #[test]
    fn account_blacklist_rejects_candidate_of_that_account() {
        use crate::ports::{AccountModelAccess, VendorModelListEntry};
        let mut catalog = test_catalog();
        catalog.set_account_model_access(AccountModelAccess {
            account_id: 1,
            blacklist: vec![VendorModelListEntry {
                vendor_code: "openai".to_owned(),
                models: vec!["gpt-4".to_owned()],
            }],
            whitelist: Vec::new(),
        });
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model_vendor_code = Some("openai".to_owned());
        let rejection = chain
            .select_account(
                &context,
                vec![candidate(1, None, InvocationRouteCandidateKind::Model)],
            )
            .expect_err("account-blacklisted model rejected");
        assert_eq!(rejection.kind, FilterRejectionKind::ModelForbidden);
        assert!(rejection.message.contains("upstream account 1"));
    }

    #[test]
    fn account_blacklist_does_not_affect_other_accounts() {
        use crate::ports::{AccountModelAccess, VendorModelListEntry};
        let mut catalog = test_catalog();
        catalog.set_account_model_access(AccountModelAccess {
            account_id: 1,
            blacklist: vec![VendorModelListEntry {
                vendor_code: "openai".to_owned(),
                models: vec!["gpt-4".to_owned()],
            }],
            whitelist: Vec::new(),
        });
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model_vendor_code = Some("openai".to_owned());
        let result = chain
            .select_account(
                &context,
                vec![candidate(2, None, InvocationRouteCandidateKind::Model)],
            )
            .expect("unrestricted account candidate selected");
        assert_eq!(result.account.account_id, 2);
    }

    #[test]
    fn account_whitelist_rejects_unlisted_model() {
        use crate::ports::{AccountModelAccess, VendorModelListEntry};
        let mut catalog = test_catalog();
        catalog.set_account_model_access(AccountModelAccess {
            account_id: 1,
            blacklist: Vec::new(),
            whitelist: vec![VendorModelListEntry {
                vendor_code: "openai".to_owned(),
                models: vec!["gpt-4o".to_owned()],
            }],
        });
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model_vendor_code = Some("openai".to_owned());
        let rejection = chain
            .select_account(
                &context,
                vec![candidate(1, None, InvocationRouteCandidateKind::Model)],
            )
            .expect_err("model not in account whitelist rejected");
        assert_eq!(rejection.kind, FilterRejectionKind::ModelForbidden);
        assert!(rejection.message.contains("model whitelist"));
    }

    #[test]
    fn supplier_whitelist_does_not_restrict_other_suppliers() {
        use crate::ports::{SupplierModelAccess, VendorModelListEntry};
        let mut catalog = test_catalog();
        catalog.set_supplier_model_access(SupplierModelAccess {
            supplier_code: "anthropic".to_owned(),
            blacklist: Vec::new(),
            whitelist: vec![VendorModelListEntry {
                vendor_code: "anthropic".to_owned(),
                models: vec!["claude-3-5-sonnet".to_owned()],
            }],
        });
        let chain = RoutingFilterChain::new();
        let mut context = ctx(&catalog);
        context.requested_model_vendor_code = Some("openai".to_owned());
        // openai 供应商没有配置黑白名单 → 不受 anthropic 白名单影响
        let result = chain
            .select_account(
                &context,
                vec![candidate(1, None, InvocationRouteCandidateKind::Model)],
            )
            .expect("unrestricted supplier candidate selected");
        assert_eq!(result.account.account_id, 1);
    }
}
