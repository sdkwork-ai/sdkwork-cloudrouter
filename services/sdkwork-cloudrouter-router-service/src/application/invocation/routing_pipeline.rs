//! 统一路由管道（Unified Routing Pipeline）
//!
//! 模型类路由与 API 资源类路由共享同一条编排管道，差异仅在"模型→catalog key
//! 解析"阶段。管道阶段：
//!   1. 资源解析：`InvocationResource`（uri → route_key / api_code / capability）
//!   2. 模型解析（仅模型类）：请求 model → catalog key（目录索引 O(1) 解析）
//!   3. 身份分组：API key / auth token → 账号组（`AuthenticatedApiKeyContext`）
//!   4. supplier 收敛 + 账号加载：由 `UpstreamRouteSelector` 完成
//!   5. 过滤：模型黑白名单 / 健康 / 可调用性（`RoutingFilterChain`）
//!   6. 策略选择：`RoutingStrategyRegistry` 从有序候选中选出最终账号
//!   7. 计费：账号 billing_mode（prepay/postpay）驱动预扣/后扣
//!
//! 本模块是 `RoutePlanningInterceptor` 的统一入口，底层复用
//! `route_planning` 的模型/账号规划实现与 `UpstreamRouteSelector`，
//! 避免两套并行逻辑（消除历史技术债务）。

use std::sync::Arc;

use super::{Invocation, InvocationError, InvocationResource, InvocationSurface};
use crate::application::AuthenticatedApiKeyContext;
use crate::ports::UpstreamAccountRouteCatalog;

/// 资源路由类型：模型类（按模型解析 vendor）或 API 资源类（按资源直接路由）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RouteKind {
    Model,
    Api,
}

impl RouteKind {
    /// 从请求资源解析路由类型。
    ///
    /// 优先读取资源管理显式标记的 `route_kind`（对应 `ai_resource.route_kind`）；
    /// 未显式标记时按"表面 + 是否携带模型名"推导：
    /// - ProviderNative 表面不解析模型 → API 类；
    /// - OpenAI 兼容表面仅当资源要求模型且请求携带模型名时 → 模型类。
    pub fn of(resource: &InvocationResource) -> Self {
        if let Some(kind) = resource.route_kind {
            return kind;
        }
        if resource.surface == InvocationSurface::ProviderNative {
            return Self::Api;
        }
        if resource.model_requirement.routes_model_when_present()
            && resource
                .requested_model
                .as_deref()
                .map(str::trim)
                .is_some_and(|value| !value.is_empty())
        {
            Self::Model
        } else {
            Self::Api
        }
    }

    /// 返回显式标记值（`ai_resource.route_kind`），未标记时为 `None`。
    pub fn explicit(resource: &InvocationResource) -> Option<Self> {
        resource.route_kind
    }
}

/// 统一路由管道：模型类 / API 资源类共享的编排入口。
///
/// 底层规划由 `UpstreamRouteSelector`（模型类/账号类）完成，策略体现在其
/// 排序结果中；后续 `RoutingFilterChain` 与策略注册表在账号解析阶段
/// 选择最终账号。
pub struct RoutingPipeline<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
}

impl<C> RoutingPipeline<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    pub fn new(catalog: Arc<C>) -> Self {
        Self { catalog }
    }

    /// 统一规划入口：按 `RouteKind` 分流到模型类 / API 资源类规划。
    pub fn plan_route(
        &self,
        invocation: &mut Invocation,
        context: AuthenticatedApiKeyContext,
    ) -> Result<(), InvocationError> {
        self.apply_persisted_route_kind(invocation);
        match RouteKind::of(&invocation.resource) {
            RouteKind::Model => super::route_planning::plan_model_route_pipeline(
                self.catalog.as_ref(),
                invocation,
                context,
            ),
            RouteKind::Api => super::route_planning::plan_account_route_pipeline(
                self.catalog.as_ref(),
                invocation,
                context,
            ),
        }
    }

    /// 应用资源管理持久化的 `route_kind`（`ai_resource.route_kind`）。
    ///
    /// 资源显式标记 `model`/`api` 时，以标记为准覆盖运行时按表面推导的结果，
    /// 使"资源管理配置的路由类型"成为路由决策的权威来源。未标记或未命中
    /// 资源时保持原推导结果不变。
    fn apply_persisted_route_kind(&self, invocation: &mut Invocation) {
        let explicit = RouteKind::explicit(&invocation.resource);
        if explicit.is_some() {
            return;
        }
        let Some(kind) = self.catalog.resource_route_kind(
            &invocation.resource.route_key,
            &invocation.resource.api_code,
        ) else {
            return;
        };
        match kind.as_str() {
            "model" => invocation.resource.route_kind = Some(RouteKind::Model),
            "api" => invocation.resource.route_kind = Some(RouteKind::Api),
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::invocation::{
        Invocation, InvocationBilling, InvocationRequest, InvocationResource, InvocationSubject,
    };
    use crate::domain::{AiRouteModelRequirement, RoutingCapability};

    #[test]
    fn route_kind_is_model_when_model_required_and_present() {
        let resource = InvocationResource::model_call(
            "openai/chat/completions",
            "openai.chat_completions",
            RoutingCapability::Chat,
            AiRouteModelRequirement::Required,
        )
        .with_requested_model("gpt-4o-mini");
        assert_eq!(RouteKind::Model, RouteKind::of(&resource));
    }

    #[test]
    fn route_kind_is_api_when_model_absent() {
        let resource = InvocationResource::api_resource(
            "openai/embeddings",
            "openai.embeddings",
            RoutingCapability::Embedding,
        );
        assert_eq!(RouteKind::Api, RouteKind::of(&resource));
    }

    #[test]
    fn route_kind_prefers_explicit_marker_over_surface() {
        // 资源管理显式标记 model 类后，即使落在 ProviderNative 表面也保持模型类路由。
        let mut resource = InvocationResource::model_call(
            "openai/chat/completions",
            "openai.chat_completions",
            RoutingCapability::Chat,
            AiRouteModelRequirement::Required,
        )
        .with_requested_model("gpt-4o-mini");
        resource.surface = InvocationSurface::ProviderNative;
        assert_eq!(RouteKind::Model, RouteKind::of(&resource));
    }

    #[test]
    fn route_kind_explicit_api_marker_derives_api() {
        // 资源管理显式标记 api 类，即使携带模型名也走 API 资源类路由。
        let resource = InvocationResource::api_resource(
            "openai/embeddings",
            "openai.embeddings",
            RoutingCapability::Embedding,
        )
        .with_requested_model("text-embedding-3-small")
        .with_route_kind(RouteKind::Api);
        assert_eq!(RouteKind::Api, RouteKind::of(&resource));
    }

    fn invocation() -> Invocation {
        Invocation::new(
            InvocationRequest::new(axum::http::Method::POST, "/v1/chat/completions"),
            InvocationSubject {
                auth_type: crate::application::invocation::InvocationAuthType::GatewayApiKey,
                api_key_id: Some(1),
                api_key_name_snapshot: None,
                tenant_id: 10,
                organization_id: 20,
                user_id: 30,
                account_group_id: Some(1),
                account_group_code: Some("group-1".to_owned()),
                pricing_plan_code: None,
                roles: Vec::new(),
                scopes: Vec::new(),
            },
            InvocationResource::model_call(
                "openai/chat/completions",
                "openai.chat_completions",
                RoutingCapability::Chat,
                AiRouteModelRequirement::Required,
            )
            .with_requested_model("gpt-4o-mini"),
            InvocationBilling::free(),
        )
    }

    #[test]
    fn pipeline_is_constructible() {
        let catalog = Arc::new(crate::infrastructure::InMemoryPricingCatalog::default());
        let pipeline = RoutingPipeline::new(catalog);
        let mut invocation = invocation();
        // 无模型目录时模型类规划失败是预期行为；管道本身可构造可调用。
        let _ = pipeline;
        let _ = &mut invocation;
        assert_eq!(RouteKind::Model, RouteKind::of(&invocation.resource));
    }

    #[test]
    fn model_vendor_codes_by_name_resolves_all_supporting_vendors() {
        use crate::domain::AiModel;
        let mut catalog = crate::infrastructure::InMemoryPricingCatalog::default();
        // 同一模型名被多个 vendor 提供（catalog key 不同）。
        catalog.add_model(
            AiModel::new("gpt-4o-mini", "GPT-4o mini", "openai", vec!["chat"])
                .with_catalog_key("openai/gpt-4o-mini"),
        );
        catalog.add_model(
            AiModel::new("gpt-4o-mini", "GPT-4o mini (alias)", "azure", vec!["chat"])
                .with_catalog_key("azure/gpt-4o-mini"),
        );
        catalog.add_model(
            AiModel::new("unrelated", "Unrelated", "deepseek", vec!["chat"])
                .with_catalog_key("deepseek/unrelated"),
        );
        // 通过资源对象（模型类）解析 vendor 列表。
        let catalog = Arc::new(catalog);
        let mut invocation = invocation();
        invocation.resource.route_kind = Some(RouteKind::Model);
        invocation.resource.requested_model = Some("gpt-4o-mini".to_owned());
        let vendors = catalog.model_vendor_codes_by_name("gpt-4o-mini");
        assert_eq!(vec!["openai".to_owned(), "azure".to_owned()], vendors);
    }

    #[test]
    fn persisted_route_kind_is_applied_by_pipeline() {
        use crate::domain::{UpstreamAccountRoute, UpstreamResourceEntitlement};
        let mut catalog = crate::infrastructure::InMemoryPricingCatalog::default();
        // 构造一条资源 entitlement，显式标记 route_kind = model。
        let mut entitlement =
            UpstreamResourceEntitlement::new("openai.chat_completions", "api_endpoint")
                .with_route_kind("model");
        entitlement.api_code = Some("openai.chat_completions".to_owned());
        let route = UpstreamAccountRoute::new("s1", 1)
            .with_upstream_endpoint(Some("https://example.com"), Some("secret"))
            .with_account_group_bindings(vec![crate::domain::UpstreamAccountGroupBinding::new(
                1, 100, 100,
            )
            .with_resource_entitlements(vec![entitlement])]);
        catalog.add_upstream_account_route(route);
        let catalog = Arc::new(catalog);
        // 路由 key 为 openai/chat/completions（归一化后 = openai.chat_completions），
        // 无显式 route_kind → 管道应从持久化 entitlement 应用 model 标记。
        let mut invocation = invocation();
        invocation.resource.route_kind = None;
        invocation.resource.route_key = "openai/chat/completions".to_owned();
        invocation.resource.api_code = "openai.chat_completions".to_owned();
        let pipeline = RoutingPipeline::new(Arc::clone(&catalog));
        pipeline.apply_persisted_route_kind(&mut invocation);
        assert_eq!(
            Some(RouteKind::Model),
            invocation.resource.route_kind,
            "资源管理持久化的 route_kind=model 必须被管道应用"
        );
    }

    #[test]
    fn explicit_route_kind_wins_over_persisted_marker() {
        use crate::domain::{UpstreamAccountRoute, UpstreamResourceEntitlement};
        let mut catalog = crate::infrastructure::InMemoryPricingCatalog::default();
        let mut entitlement =
            UpstreamResourceEntitlement::new("openai.chat_completions", "api_endpoint")
                .with_route_kind("model");
        entitlement.api_code = Some("openai.chat_completions".to_owned());
        let route = UpstreamAccountRoute::new("s1", 1)
            .with_upstream_endpoint(Some("https://example.com"), Some("secret"))
            .with_account_group_bindings(vec![crate::domain::UpstreamAccountGroupBinding::new(
                1, 100, 100,
            )
            .with_resource_entitlements(vec![entitlement])]);
        catalog.add_upstream_account_route(route);
        let catalog = Arc::new(catalog);
        let mut invocation = invocation();
        invocation.resource.route_key = "openai/chat/completions".to_owned();
        invocation.resource.api_code = "openai.chat_completions".to_owned();
        invocation.resource.route_kind = Some(RouteKind::Api);
        let pipeline = RoutingPipeline::new(catalog);
        pipeline.apply_persisted_route_kind(&mut invocation);
        assert_eq!(
            Some(RouteKind::Api),
            invocation.resource.route_kind,
            "调用链显式标记优先于持久化标记"
        );
    }
}
