//! 计费主体解析端口。
//!
//! 网关在 API key 鉴权成功后调用本端口，把 (tenant_id, user_id, key 绑定
//! 组织) 解析为本次请求的计费主体（个人钱包 or 团队钱包）。真源是 IAM
//! 服务的 `iam_organization_membership`；网关侧通过
//! `iam_gateway_billing_subject` 投影表消费（生产者负责在成员关系变更时
//! 维护投影，消费者与生产者解耦）。

use std::future::Future;
use std::pin::Pin;

use crate::application::AuthenticatedApiKeyContext;
use crate::domain::BillingOwnerKind;

/// 计费主体解析失败类型。
///
/// - `MembershipRequired`：key 显式绑定了组织，但用户当前不是该组织的
///   有效成员。对齐行业行为（OpenAI：移出组织后 key 立即失效），必须
///   显式拒绝而不是静默转个人计费。
/// - `Transient`：投影存储暂时不可用等可降级错误，调用方应回退个人
///   计费并记录告警。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BillingSubjectError {
    MembershipRequired { organization_id: i64 },
    Transient(String),
}

impl BillingSubjectError {
    pub fn message(&self) -> String {
        match self {
            Self::MembershipRequired { organization_id } => format!(
                "api key is bound to organization {organization_id} but the user is not an active member"
            ),
            Self::Transient(message) => message.clone(),
        }
    }
}

/// 计费主体的判定来源，用于审计与可观测性。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BillingSubjectSource {
    /// key 显式绑定组织（控制台在团队上下文创建的 key）。
    KeyBound,
    /// 用户仅归属一个有效组织，自动跟随。
    SingleMembership,
    /// 用户归属多个组织，按默认组织（is_primary）判定。
    PrimaryMembership,
    /// 投影表显式指定的个人计费（例如用户主动关闭团队计费）。
    ExplicitPersonal,
}

impl BillingSubjectSource {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::KeyBound => "key_bound",
            Self::SingleMembership => "single_membership",
            Self::PrimaryMembership => "primary_membership",
            Self::ExplicitPersonal => "explicit_personal",
        }
    }
}

/// 解析结果：计费主体 + 团队上下文快照。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedBillingSubject {
    pub kind: BillingOwnerKind,
    /// 团队计费时为团队组织 id，个人计费时为 0。
    pub organization_id: i64,
    /// 团队名称快照（写入 usage 归因列；个人计费为 None）。
    pub organization_name_snapshot: Option<String>,
    pub source: BillingSubjectSource,
}

impl ResolvedBillingSubject {
    /// 个人计费结果（保持既有行为：钱包按 key 自身的 org/user 定位）。
    pub fn personal() -> Self {
        Self {
            kind: BillingOwnerKind::Personal,
            organization_id: 0,
            organization_name_snapshot: None,
            source: BillingSubjectSource::ExplicitPersonal,
        }
    }

    pub fn team(
        organization_id: i64,
        organization_name_snapshot: Option<String>,
        source: BillingSubjectSource,
    ) -> Self {
        Self {
            kind: BillingOwnerKind::Organization,
            organization_id,
            organization_name_snapshot,
            source,
        }
    }
}

pub type BillingSubjectFuture<'a> =
    Pin<Box<dyn Future<Output = Result<ResolvedBillingSubject, BillingSubjectError>> + Send + 'a>>;

/// 计费主体解析端口。
///
/// 实现必须是无状态且可并发调用的；缓存（TTL、失效）由装饰器层负责，
/// 存储实现只负责单次真源读取。
pub trait BillingSubjectResolver: Send + Sync {
    fn resolve<'a>(&'a self, context: &'a AuthenticatedApiKeyContext) -> BillingSubjectFuture<'a>;
}
