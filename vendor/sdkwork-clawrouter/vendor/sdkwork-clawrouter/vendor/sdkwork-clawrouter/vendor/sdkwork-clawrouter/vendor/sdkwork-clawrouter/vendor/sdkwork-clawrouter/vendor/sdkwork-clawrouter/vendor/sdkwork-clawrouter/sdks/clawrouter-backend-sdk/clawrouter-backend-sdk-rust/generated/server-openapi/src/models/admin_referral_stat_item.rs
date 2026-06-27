use serde::{Deserialize, Serialize};

/// Admin referral stat item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminReferralStatItem {
    /// Bonus awarded field on admin referral stat item.
    pub bonus_awarded: String,

    /// Id field on admin referral stat item.
    pub id: String,

    /// Inviter field on admin referral stat item.
    pub inviter: String,

    /// Link field on admin referral stat item.
    pub link: String,

    /// Total invited field on admin referral stat item.
    pub total_invited: String,

    /// Total revenue field on admin referral stat item.
    pub total_revenue: String,
}
