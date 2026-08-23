//! 路由策略模式（Route Strategy Pattern）
//!
//! 高内聚低耦合、可扩展的候选账号选择策略。
//!
//! 设计要点：
//! - [`RoutingStrategy`] 是唯一抽象：给定候选账号与上下文，产出选择结果。
//! - 内置策略（价格优先 / sticky / 质量优先 / 响应时间优先 / 权重 / 轮询）
//!   各自独立实现，互不依赖。
//! - [`RoutingStrategyRegistry`] 通过 `strategy_code` 解析策略实例，
//!   admin 侧 `ai_routing_strategy` 表存策略配置，代码侧注册实现。
//! - 新增策略 = 实现 [`RoutingStrategy`] + 注册到 registry，不改动任何现有调用方。

use std::collections::HashMap;

use super::InvocationRouteCandidate;

/// 策略代码：与 `ai_routing_strategy.strategy_code` 对齐。
pub const STRATEGY_PRICE_FIRST: &str = "price_first";
pub const STRATEGY_STICKY: &str = "sticky";
pub const STRATEGY_QUALITY_FIRST: &str = "quality_first";
pub const STRATEGY_LATENCY_FIRST: &str = "latency_first";
pub const STRATEGY_WEIGHTED: &str = "weighted";
pub const STRATEGY_ROUND_ROBIN: &str = "round_robin";

/// 选择上下文：策略执行所需的只读信息。
#[derive(Debug, Clone, Default)]
pub struct RouteSelectionContext {
    /// 候选账号的排序键（价格优先时由调用方按单位价格预排序）。
    pub price_order: Vec<i64>,
    /// sticky 约束：优先命中该账号。
    pub sticky_account_id: Option<i64>,
    /// 质量分（越高越好），由健康/可用性指标归一化。
    pub quality_scores: HashMap<i64, f64>,
    /// 最近平均响应时间（越低越好）。
    pub latency_ms: HashMap<i64, u64>,
    /// 权重（加权随机/加权轮询）。
    pub weights: HashMap<i64, u64>,
    /// 轮询游标（round_robin 使用，按 account_id 维度）。
    pub round_robin_cursor: usize,
    /// 策略参数（来自 `ai_routing_strategy.params`，如
    /// `{"sticky_ttl_sec":300}`、`{"weights":{"1":70,"2":30}}`）。
    pub params: serde_json::Map<String, serde_json::Value>,
}

/// 策略选择结果。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StrategySelection {
    /// 直接命中某个候选。
    Selected(usize),
    /// 策略无法决策（例如 sticky 目标不在候选集），由调用方回退默认策略。
    Fallback,
    /// 候选为空或策略认为不可用。
    NoCandidate,
}

/// 路由策略抽象：`code()` 全局唯一，`select()` 只读决策，无副作用。
pub trait RoutingStrategy: Send + Sync {
    fn code(&self) -> &'static str;

    fn select(
        &self,
        candidates: &[InvocationRouteCandidate],
        ctx: &RouteSelectionContext,
    ) -> StrategySelection;
}

/// 价格优先：选择单价最低的候选。
///
/// 候选已由调用方按成本价升序给出（`price_order` 提供原始顺序），
/// 此处直接取首个可用的低价格候选；若显式携带 `price_order` 则按它排序。
pub struct PriceFirstStrategy;

impl RoutingStrategy for PriceFirstStrategy {
    fn code(&self) -> &'static str {
        STRATEGY_PRICE_FIRST
    }

    fn select(
        &self,
        candidates: &[InvocationRouteCandidate],
        ctx: &RouteSelectionContext,
    ) -> StrategySelection {
        if candidates.is_empty() {
            return StrategySelection::NoCandidate;
        }
        if !ctx.price_order.is_empty() {
            for account_id in &ctx.price_order {
                if let Some(index) = candidates
                    .iter()
                    .position(|candidate| candidate.account_id == *account_id)
                {
                    return StrategySelection::Selected(index);
                }
            }
        }
        StrategySelection::Selected(0)
    }
}

/// sticky：优先命中已粘滞的账号；目标不在候选集则回退默认策略。
pub struct StickyStrategy;

impl RoutingStrategy for StickyStrategy {
    fn code(&self) -> &'static str {
        STRATEGY_STICKY
    }

    fn select(
        &self,
        candidates: &[InvocationRouteCandidate],
        ctx: &RouteSelectionContext,
    ) -> StrategySelection {
        let Some(target) = ctx.sticky_account_id else {
            return StrategySelection::Fallback;
        };
        candidates
            .iter()
            .position(|candidate| candidate.account_id == target)
            .map(StrategySelection::Selected)
            .unwrap_or(StrategySelection::Fallback)
    }
}

/// 质量优先：选择质量分最高者；无质量分时回退价格优先。
pub struct QualityFirstStrategy;

impl RoutingStrategy for QualityFirstStrategy {
    fn code(&self) -> &'static str {
        STRATEGY_QUALITY_FIRST
    }

    fn select(
        &self,
        candidates: &[InvocationRouteCandidate],
        ctx: &RouteSelectionContext,
    ) -> StrategySelection {
        if candidates.is_empty() {
            return StrategySelection::NoCandidate;
        }
        let mut best_index = 0usize;
        let mut best_score = f64::NEG_INFINITY;
        for (index, candidate) in candidates.iter().enumerate() {
            let score = ctx
                .quality_scores
                .get(&candidate.account_id)
                .copied()
                .unwrap_or(0.0);
            if score > best_score {
                best_score = score;
                best_index = index;
            }
        }
        if best_score.is_finite() {
            StrategySelection::Selected(best_index)
        } else {
            StrategySelection::Fallback
        }
    }
}

/// 响应时间优先：选择最近平均延迟最低者；无延迟数据回退价格优先。
pub struct LatencyFirstStrategy;

impl RoutingStrategy for LatencyFirstStrategy {
    fn code(&self) -> &'static str {
        STRATEGY_LATENCY_FIRST
    }

    fn select(
        &self,
        candidates: &[InvocationRouteCandidate],
        ctx: &RouteSelectionContext,
    ) -> StrategySelection {
        if candidates.is_empty() {
            return StrategySelection::NoCandidate;
        }
        let mut best_index = 0usize;
        let mut best_latency = u64::MAX;
        let mut found = false;
        for (index, candidate) in candidates.iter().enumerate() {
            if let Some(latency) = ctx.latency_ms.get(&candidate.account_id) {
                if !found || *latency < best_latency {
                    best_latency = *latency;
                    best_index = index;
                    found = true;
                }
            }
        }
        if found {
            StrategySelection::Selected(best_index)
        } else {
            StrategySelection::Fallback
        }
    }
}

/// 权重策略：按 `weights` 权重做加权轮询（近似）；未配置权重回退价格优先。
pub struct WeightedStrategy;

impl RoutingStrategy for WeightedStrategy {
    fn code(&self) -> &'static str {
        STRATEGY_WEIGHTED
    }

    fn select(
        &self,
        candidates: &[InvocationRouteCandidate],
        ctx: &RouteSelectionContext,
    ) -> StrategySelection {
        if candidates.is_empty() {
            return StrategySelection::NoCandidate;
        }
        let mut weighted: Vec<(i64, u64)> = candidates
            .iter()
            .filter_map(|candidate| {
                ctx.weights
                    .get(&candidate.account_id)
                    .copied()
                    .map(|weight| (candidate.account_id, weight))
            })
            .collect();
        if weighted.is_empty() {
            return StrategySelection::Fallback;
        }
        weighted.sort_by_key(|(_, weight)| std::cmp::Reverse(*weight));
        let cursor = ctx.round_robin_cursor % weighted.len();
        let target = weighted[cursor].0;
        candidates
            .iter()
            .position(|candidate| candidate.account_id == target)
            .map(StrategySelection::Selected)
            .unwrap_or(StrategySelection::Fallback)
    }
}

/// 轮询策略：按 account_id 顺序轮转。
pub struct RoundRobinStrategy;

impl RoutingStrategy for RoundRobinStrategy {
    fn code(&self) -> &'static str {
        STRATEGY_ROUND_ROBIN
    }

    fn select(
        &self,
        candidates: &[InvocationRouteCandidate],
        ctx: &RouteSelectionContext,
    ) -> StrategySelection {
        if candidates.is_empty() {
            return StrategySelection::NoCandidate;
        }
        let index = ctx.round_robin_cursor % candidates.len();
        StrategySelection::Selected(index)
    }
}

/// 策略注册表：`strategy_code` → 策略实例。默认回退价格优先。
#[derive(Default)]
pub struct RoutingStrategyRegistry {
    strategies: HashMap<&'static str, Box<dyn RoutingStrategy>>,
}

impl RoutingStrategyRegistry {
    pub fn new() -> Self {
        let mut registry = Self::default();
        registry.register(Box::new(PriceFirstStrategy));
        registry.register(Box::new(StickyStrategy));
        registry.register(Box::new(QualityFirstStrategy));
        registry.register(Box::new(LatencyFirstStrategy));
        registry.register(Box::new(WeightedStrategy));
        registry.register(Box::new(RoundRobinStrategy));
        registry
    }

    pub fn register(&mut self, strategy: Box<dyn RoutingStrategy>) {
        self.strategies.insert(strategy.code(), strategy);
    }

    /// 按代码解析策略；未知代码回退价格优先（保证默认行为稳定）。
    pub fn resolve(&self, code: &str) -> &dyn RoutingStrategy {
        self.strategies
            .get(code)
            .map(|strategy| strategy.as_ref())
            .unwrap_or_else(|| self.strategies[STRATEGY_PRICE_FIRST].as_ref())
    }

    pub fn codes(&self) -> Vec<&'static str> {
        self.strategies.keys().copied().collect()
    }
}

/// 将策略字符串（来自 `ai_routing_strategy.strategy_code` /
/// api key binding `routing_strategy`）解析为领域枚举值。
///
/// 统一映射入口，避免选择器/规划器各处维护各自的 match 表；
/// `sticky` 与 `latency_first` 映射到外部 crate 的对应语义
/// （sticky 在 invocation 层由 sticky 路由机制处理，此处映射为
/// `LeastCost` 兜底排序；`latency_first` 即 `LeastLatency`）。
pub fn resolve_account_routing_strategy(
    code: &str,
) -> Option<crate::domain::UpstreamAccountRoutingStrategy> {
    use crate::domain::UpstreamAccountRoutingStrategy as S;
    match code.trim().to_ascii_lowercase().as_str() {
        "weighted" => Some(S::Weighted),
        "round_robin" | "roundrobin" => Some(S::RoundRobin),
        "latency_first" | "least_latency" => Some(S::LeastLatency),
        "price_first" | "least_cost" | "cheapest" => Some(S::LeastCost),
        "quality_first" => Some(S::QualityFirst),
        "failover" => Some(S::Failover),
        // sticky 目标由 invocation 层 sticky 路由处理；此处回退价格优先排序。
        "sticky" => Some(S::LeastCost),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::invocation::{
        AccountBillingMode, InvocationRouteCandidateKind,
    };

    fn candidate(account_id: i64) -> InvocationRouteCandidate {
        InvocationRouteCandidate {
            kind: InvocationRouteCandidateKind::Model,
            supplier_code: "openai".to_owned(),
            account_id,
            account_group_id: None,
            account_group_code: None,
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
            auth_profile: Default::default(),
            timeout_ms: Some(30_000),
            retry_policy: None,
            billing_mode: AccountBillingMode::Prepay,
        }
    }

    #[test]
    fn price_first_picks_lowest_price() {
        let strategy = PriceFirstStrategy;
        let candidates = vec![candidate(1), candidate(2), candidate(3)];
        let ctx = RouteSelectionContext {
            price_order: vec![3, 2, 1],
            ..Default::default()
        };
        assert_eq!(
            StrategySelection::Selected(2),
            strategy.select(&candidates, &ctx)
        );
    }

    #[test]
    fn price_first_defaults_to_first_candidate() {
        let strategy = PriceFirstStrategy;
        let candidates = vec![candidate(1), candidate(2)];
        assert_eq!(
            StrategySelection::Selected(0),
            strategy.select(&candidates, &RouteSelectionContext::default())
        );
    }

    #[test]
    fn sticky_pins_target_account() {
        let strategy = StickyStrategy;
        let candidates = vec![candidate(1), candidate(2)];
        let ctx = RouteSelectionContext {
            sticky_account_id: Some(2),
            ..Default::default()
        };
        assert_eq!(
            StrategySelection::Selected(1),
            strategy.select(&candidates, &ctx)
        );
    }

    #[test]
    fn sticky_falls_back_when_target_missing() {
        let strategy = StickyStrategy;
        let candidates = vec![candidate(1)];
        let ctx = RouteSelectionContext {
            sticky_account_id: Some(99),
            ..Default::default()
        };
        assert_eq!(
            StrategySelection::Fallback,
            strategy.select(&candidates, &ctx)
        );
    }

    #[test]
    fn quality_picks_highest_score() {
        let strategy = QualityFirstStrategy;
        let candidates = vec![candidate(1), candidate(2)];
        let mut quality_scores = HashMap::new();
        quality_scores.insert(1, 0.9);
        quality_scores.insert(2, 0.99);
        let ctx = RouteSelectionContext {
            quality_scores,
            ..Default::default()
        };
        assert_eq!(
            StrategySelection::Selected(1),
            strategy.select(&candidates, &ctx)
        );
    }

    #[test]
    fn latency_picks_lowest() {
        let strategy = LatencyFirstStrategy;
        let candidates = vec![candidate(1), candidate(2)];
        let mut latency_ms = HashMap::new();
        latency_ms.insert(1, 120);
        latency_ms.insert(2, 60);
        let ctx = RouteSelectionContext {
            latency_ms,
            ..Default::default()
        };
        assert_eq!(
            StrategySelection::Selected(1),
            strategy.select(&candidates, &ctx)
        );
    }

    #[test]
    fn weighted_picks_by_weight_cursor() {
        let strategy = WeightedStrategy;
        let candidates = vec![candidate(1), candidate(2)];
        let mut weights = HashMap::new();
        weights.insert(1, 30);
        weights.insert(2, 70);
        let ctx = RouteSelectionContext {
            weights,
            round_robin_cursor: 0,
            ..Default::default()
        };
        // 权重最高的 account 2 排最前
        assert_eq!(
            StrategySelection::Selected(1),
            strategy.select(&candidates, &ctx)
        );
    }

    #[test]
    fn registry_resolves_known_and_falls_back() {
        let registry = RoutingStrategyRegistry::new();
        assert_eq!(
            STRATEGY_PRICE_FIRST,
            registry.resolve(STRATEGY_PRICE_FIRST).code()
        );
        assert_eq!(
            STRATEGY_STICKY,
            registry.resolve(STRATEGY_STICKY).code()
        );
        assert_eq!(
            STRATEGY_PRICE_FIRST,
            registry.resolve("unknown_strategy").code()
        );
        assert_eq!(6, registry.codes().len());
    }

    #[test]
    fn empty_candidates_yield_no_candidate() {
        let strategy = PriceFirstStrategy;
        assert_eq!(
            StrategySelection::NoCandidate,
            strategy.select(&[], &RouteSelectionContext::default())
        );
    }

    #[test]
    fn resolve_strategy_maps_all_codes() {
        use crate::domain::UpstreamAccountRoutingStrategy as S;
        assert_eq!(
            Some(S::Weighted),
            resolve_account_routing_strategy("weighted")
        );
        assert_eq!(
            Some(S::RoundRobin),
            resolve_account_routing_strategy("round_robin")
        );
        assert_eq!(
            Some(S::LeastLatency),
            resolve_account_routing_strategy("latency_first")
        );
        assert_eq!(
            Some(S::LeastCost),
            resolve_account_routing_strategy("price_first")
        );
        assert_eq!(
            Some(S::QualityFirst),
            resolve_account_routing_strategy("quality_first")
        );
        assert_eq!(
            Some(S::Failover),
            resolve_account_routing_strategy("failover")
        );
        assert_eq!(None, resolve_account_routing_strategy("unknown"));
    }
}
