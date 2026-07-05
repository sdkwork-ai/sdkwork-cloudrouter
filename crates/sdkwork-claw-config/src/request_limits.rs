#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RequestLimitsConfig {
    admin_app_json_body_max_bytes: usize,
    admin_skill_json_body_max_bytes: usize,
    payment_callback_body_max_bytes: usize,
    gateway_invocation_body_max_bytes: usize,
}

impl RequestLimitsConfig {
    pub const ENV_ADMIN_APP_JSON_BODY_MAX_BYTES: &'static str =
        "SDKWORK_CLAW_ADMIN_APP_JSON_BODY_MAX_BYTES";
    pub const ENV_ADMIN_SKILL_JSON_BODY_MAX_BYTES: &'static str =
        "SDKWORK_CLAW_ADMIN_SKILL_JSON_BODY_MAX_BYTES";
    pub const ENV_PAYMENT_CALLBACK_BODY_MAX_BYTES: &'static str =
        "SDKWORK_CLAW_PAYMENT_CALLBACK_BODY_MAX_BYTES";
    pub const ENV_GATEWAY_INVOCATION_BODY_MAX_BYTES: &'static str =
        "SDKWORK_CLAW_GATEWAY_INVOCATION_BODY_MAX_BYTES";

    pub const DEFAULT_ADMIN_APP_JSON_BODY_MAX_BYTES: usize = 128 * 1024;
    pub const DEFAULT_ADMIN_SKILL_JSON_BODY_MAX_BYTES: usize = 64 * 1024;
    pub const DEFAULT_PAYMENT_CALLBACK_BODY_MAX_BYTES: usize = 64 * 1024;
    /// Default maximum request body size for gateway invocation endpoints
    /// (`/v1/*`). 1 MiB is generous for OpenAI-compatible JSON payloads
    /// (chat completions, embeddings, etc.) while preventing a single
    /// oversized request from consuming excessive server memory under
    /// concurrent load.
    pub const DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES: usize = 1024 * 1024;

    pub fn from_env() -> Result<Self, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Self, String> {
        Ok(Self {
            admin_app_json_body_max_bytes: configured_usize_limit(
                Self::ENV_ADMIN_APP_JSON_BODY_MAX_BYTES,
                runtime_toml.and_then(|config| config.request_limits.admin_app_json_body_max_bytes),
                Self::DEFAULT_ADMIN_APP_JSON_BODY_MAX_BYTES,
            )?,
            admin_skill_json_body_max_bytes: configured_usize_limit(
                Self::ENV_ADMIN_SKILL_JSON_BODY_MAX_BYTES,
                runtime_toml
                    .and_then(|config| config.request_limits.admin_skill_json_body_max_bytes),
                Self::DEFAULT_ADMIN_SKILL_JSON_BODY_MAX_BYTES,
            )?,
            payment_callback_body_max_bytes: configured_usize_limit(
                Self::ENV_PAYMENT_CALLBACK_BODY_MAX_BYTES,
                runtime_toml
                    .and_then(|config| config.request_limits.payment_callback_body_max_bytes),
                Self::DEFAULT_PAYMENT_CALLBACK_BODY_MAX_BYTES,
            )?,
            gateway_invocation_body_max_bytes: configured_usize_limit(
                Self::ENV_GATEWAY_INVOCATION_BODY_MAX_BYTES,
                runtime_toml
                    .and_then(|config| config.request_limits.gateway_invocation_body_max_bytes),
                Self::DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES,
            )?,
        })
    }

    pub fn admin_app_json_body_max_bytes(&self) -> usize {
        self.admin_app_json_body_max_bytes
    }

    pub fn admin_skill_json_body_max_bytes(&self) -> usize {
        self.admin_skill_json_body_max_bytes
    }

    pub fn payment_callback_body_max_bytes(&self) -> usize {
        self.payment_callback_body_max_bytes
    }

    pub fn gateway_invocation_body_max_bytes(&self) -> usize {
        self.gateway_invocation_body_max_bytes
    }
}

impl Default for RequestLimitsConfig {
    fn default() -> Self {
        Self {
            admin_app_json_body_max_bytes: Self::DEFAULT_ADMIN_APP_JSON_BODY_MAX_BYTES,
            admin_skill_json_body_max_bytes: Self::DEFAULT_ADMIN_SKILL_JSON_BODY_MAX_BYTES,
            payment_callback_body_max_bytes: Self::DEFAULT_PAYMENT_CALLBACK_BODY_MAX_BYTES,
            gateway_invocation_body_max_bytes: Self::DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES,
        }
    }
}

fn configured_usize_limit(
    name: &str,
    config_value: Option<u64>,
    default_value: usize,
) -> Result<usize, String> {
    let value = crate::runtime::config_u64(name, config_value)?.unwrap_or(default_value as u64);
    let value = usize::try_from(value)
        .map_err(|_| format!("{name} must fit in the current platform pointer size"))?;
    if value == 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(value)
}
