//! `iam_gateway_billing_subject`（计费主体投影）读取实现。
//!
//! 真源是 IAM 服务的 `iam_organization_membership`；本表是网关侧的成员
//! 关系投影（镜像），由生产者（IAM 同步或运维工具）在成员关系变更时
//! 维护。网关只读，解析逻辑在网关侧执行：
//!
//! 1. key 显式绑定组织：投影中存在 (tenant, user, org) 的 active 行 →
//!    团队计费；不存在 → `MembershipRequired`（key 失效，显式 403）。
//! 2. key 未绑定组织：恰好一个 active 组织 → 跟随；多个 → 取
//!    `is_primary`；无 primary → 回退个人并告警；零个 → 个人。

use sqlx::PgPool;

use crate::application::AuthenticatedApiKeyContext;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    BillingSubjectError, BillingSubjectFuture, BillingSubjectResolver, BillingSubjectSource,
    ResolvedBillingSubject,
};

#[derive(Debug, Clone)]
pub struct PostgresBillingSubjectResolver {
    pool: PgPool,
}

struct MembershipRow {
    organization_id: i64,
    organization_name_snapshot: String,
    is_primary: bool,
}

impl PostgresBillingSubjectResolver {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 启动期自检：投影表不存在时返回 false，组合层应降级为恒个人
    /// 计费（fail-safe），避免每个请求都打出缺表告警。
    pub async fn table_ready(&self) -> bool {
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'iam_gateway_membership'",
        )
        .fetch_one(&self.pool)
        .await
        .map(|count| count > 0)
        .unwrap_or(false)
    }

    async fn active_memberships(
        &self,
        tenant_id: i64,
        user_id: i64,
    ) -> Result<Vec<MembershipRow>, BillingSubjectError> {
        sqlx::query_as::<_, (i64, String, i32)>(
            r#"
            SELECT organization_id, organization_name_snapshot, is_primary
            FROM iam_gateway_membership
            WHERE tenant_id = $1
              AND user_id = $2
              AND status = 1
              AND deleted_at IS NULL
            "#,
        )
        .bind(tenant_id)
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map(|rows| {
            rows.into_iter()
                .map(
                    |(organization_id, organization_name_snapshot, is_primary)| MembershipRow {
                        organization_id,
                        organization_name_snapshot,
                        is_primary: is_primary != 0,
                    },
                )
                .collect()
        })
        .map_err(|error| {
            BillingSubjectError::Transient(
                redacted_store_error("failed to load billing subject memberships", error)
                    .to_string(),
            )
        })
    }
}

impl BillingSubjectResolver for PostgresBillingSubjectResolver {
    fn resolve<'a>(&'a self, context: &'a AuthenticatedApiKeyContext) -> BillingSubjectFuture<'a> {
        Box::pin(async move {
            // 服务级/平台级主体不参与团队计费，保持既有行为。
            if context.tenant_id <= 0 || context.user_id <= 0 {
                return Ok(ResolvedBillingSubject::personal());
            }
            let rows = self
                .active_memberships(context.tenant_id, context.user_id)
                .await?;
            if context.organization_id != 0 {
                // KeyBound：key 声明的组织必须是用户的 active 成员关系。
                return match rows
                    .iter()
                    .find(|row| row.organization_id == context.organization_id)
                {
                    Some(row) => Ok(ResolvedBillingSubject::team(
                        row.organization_id,
                        non_empty(row.organization_name_snapshot.as_str()),
                        BillingSubjectSource::KeyBound,
                    )),
                    None => Err(BillingSubjectError::MembershipRequired {
                        organization_id: context.organization_id,
                    }),
                };
            }
            match rows.len() {
                0 => Ok(ResolvedBillingSubject::personal()),
                1 => {
                    let row = &rows[0];
                    Ok(ResolvedBillingSubject::team(
                        row.organization_id,
                        non_empty(row.organization_name_snapshot.as_str()),
                        BillingSubjectSource::SingleMembership,
                    ))
                }
                _ => {
                    let primary = rows.iter().find(|row| row.is_primary);
                    match primary {
                        Some(row) => Ok(ResolvedBillingSubject::team(
                            row.organization_id,
                            non_empty(row.organization_name_snapshot.as_str()),
                            BillingSubjectSource::PrimaryMembership,
                        )),
                        None => {
                            // 多组织且未设置默认组织：无法确定计费主体，
                            // 回退个人计费，由可观测性告警推动用户设置。
                            tracing::warn!(
                                tenant_id = context.tenant_id,
                                user_id = context.user_id,
                                memberships = rows.len(),
                                "billing subject ambiguous: multiple active memberships without primary; falling back to personal billing"
                            );
                            Ok(ResolvedBillingSubject::personal())
                        }
                    }
                }
            }
        })
    }
}

fn non_empty(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_owned())
    }
}

/// 投影表缺失时的降级实现：恒返回个人计费（保持既有行为）。
#[derive(Debug, Clone, Default)]
pub struct PersonalFallbackBillingSubjectResolver;

impl BillingSubjectResolver for PersonalFallbackBillingSubjectResolver {
    fn resolve<'a>(&'a self, _context: &'a AuthenticatedApiKeyContext) -> BillingSubjectFuture<'a> {
        Box::pin(async move { Ok(ResolvedBillingSubject::personal()) })
    }
}

/// 组合辅助：表就绪用真实投影解析，否则降级。
pub async fn billing_subject_resolver_for_pool(
    pool: PgPool,
) -> std::sync::Arc<dyn BillingSubjectResolver> {
    let store = PostgresBillingSubjectResolver::new(pool);
    if store.table_ready().await {
        std::sync::Arc::new(store)
    } else {
        tracing::warn!(
            "iam_gateway_membership table is missing; billing subject resolution degrades to personal billing"
        );
        std::sync::Arc::new(PersonalFallbackBillingSubjectResolver)
    }
}

#[cfg(test)]
mod tests {
    use super::non_empty;

    #[test]
    fn non_empty_trims_and_rejects_blank() {
        assert_eq!(non_empty(" 团队A ").as_deref(), Some("团队A"));
        assert_eq!(non_empty("   "), None);
    }
}
