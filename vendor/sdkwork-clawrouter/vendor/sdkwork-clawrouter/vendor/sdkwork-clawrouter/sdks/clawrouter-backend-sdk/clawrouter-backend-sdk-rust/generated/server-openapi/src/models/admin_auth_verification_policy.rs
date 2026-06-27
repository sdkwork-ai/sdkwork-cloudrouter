use serde::{Deserialize, Serialize};

/// Admin auth verification policy schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAuthVerificationPolicy {
    /// Email code login enabled field on admin auth verification policy.
    #[serde(rename = "emailCodeLoginEnabled")]
    pub email_code_login_enabled: bool,

    /// Email registration verification required field on admin auth verification policy.
    #[serde(rename = "emailRegistrationVerificationRequired")]
    pub email_registration_verification_required: bool,

    /// Phone code login enabled field on admin auth verification policy.
    #[serde(rename = "phoneCodeLoginEnabled")]
    pub phone_code_login_enabled: bool,

    /// Phone registration verification required field on admin auth verification policy.
    #[serde(rename = "phoneRegistrationVerificationRequired")]
    pub phone_registration_verification_required: bool,
}
