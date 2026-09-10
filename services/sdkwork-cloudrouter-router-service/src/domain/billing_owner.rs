/// 计费主体类型：网关用量与钱包扣费的归属维度。
///
/// - `Personal`：个人钱包（现状行为，`organization_id` 携带 key 的组织，
///   通常为 0）。
/// - `Organization`：团队钱包，归属 (tenant, organization_id=团队,
///   owner_type=ORGANIZATION, owner_id=团队)，团队内任一成员的用量都
///   记入该团队账户。
///
/// 该类型只描述"计费归属"，不描述"路由授权"：授权主体始终是 API key
/// 自身的 (tenant, organization, user, account_group) 上下文。
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Default, Hash, serde::Serialize, serde::Deserialize,
)]
pub enum BillingOwnerKind {
    /// 个人计费主体（默认，保持既有行为）。
    #[default]
    Personal,
    /// 组织（团队）计费主体。
    Organization,
}

impl BillingOwnerKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Personal => "personal",
            Self::Organization => "organization",
        }
    }

    /// `ai_metering_usage.owner_type` / `ai_metering_request_trace.owner_type`
    /// 的整数编码。1 = 用户（个人），2 = 组织。
    pub const fn usage_owner_type(self) -> i64 {
        match self {
            Self::Personal => 1,
            Self::Organization => 2,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::BillingOwnerKind;

    #[test]
    fn default_is_personal_and_encodings_are_stable() {
        assert_eq!(BillingOwnerKind::default(), BillingOwnerKind::Personal);
        assert_eq!(BillingOwnerKind::Personal.as_str(), "personal");
        assert_eq!(BillingOwnerKind::Organization.as_str(), "organization");
        assert_eq!(BillingOwnerKind::Personal.usage_owner_type(), 1);
        assert_eq!(BillingOwnerKind::Organization.usage_owner_type(), 2);
    }
}
