use serde::{Deserialize, Serialize};

/// Dashboard configuration domain schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DashboardConfigurationDomain {
    /// Domain field on dashboard configuration domain.
    pub domain: String,

    /// Id field on dashboard configuration domain.
    pub id: String,

    /// Ip field on dashboard configuration domain.
    pub ip: String,

    /// Name field on dashboard configuration domain.
    pub name: String,

    /// Remark field on dashboard configuration domain.
    pub remark: String,

    /// Status field on dashboard configuration domain.
    pub status: String,
}
