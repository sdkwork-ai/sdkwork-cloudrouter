#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RequestLimitsConfig {
    admin_app_json_body_max_bytes: usize,
    admin_skill_json_body_max_bytes: usize,
    gateway_invocation_body_max_bytes: usize,
    gateway_upload_body_max_bytes: usize,
    gateway_request_timeout_millis: u64,
}

impl RequestLimitsConfig {
    pub const ENV_ADMIN_APP_JSON_BODY_MAX_BYTES: &'static str =
        "SDKWORK_CLOUDROUTER_ADMIN_APP_JSON_BODY_MAX_BYTES";
    pub const ENV_ADMIN_SKILL_JSON_BODY_MAX_BYTES: &'static str =
        "SDKWORK_CLOUDROUTER_ADMIN_SKILL_JSON_BODY_MAX_BYTES";
    pub const ENV_GATEWAY_INVOCATION_BODY_MAX_BYTES: &'static str =
        "SDKWORK_CLOUDROUTER_GATEWAY_INVOCATION_BODY_MAX_BYTES";
    pub const ENV_GATEWAY_UPLOAD_BODY_MAX_BYTES: &'static str =
        "SDKWORK_CLOUDROUTER_GATEWAY_UPLOAD_BODY_MAX_BYTES";
    pub const ENV_GATEWAY_REQUEST_TIMEOUT_MILLIS: &'static str =
        "SDKWORK_CLOUDROUTER_GATEWAY_REQUEST_TIMEOUT_MILLIS";

    pub const DEFAULT_ADMIN_APP_JSON_BODY_MAX_BYTES: usize = 128 * 1024;
    pub const DEFAULT_ADMIN_SKILL_JSON_BODY_MAX_BYTES: usize = 64 * 1024;
    /// Default maximum request body size for gateway invocation endpoints
    /// (`/v1/*`). Must cover OpenAI's official multipart upload limits so the
    /// relay accepts real media payloads: `images/edits` supports files up to
    /// 50 MiB and `audio/transcriptions`/`translations` up to 25 MiB, while
    /// JSON payloads (chat completions, embeddings) are far smaller. 25 MiB
    /// covers every official audio upload and most image edits; operators may
    /// raise it via
    /// `SDKWORK_CLOUDROUTER_GATEWAY_INVOCATION_BODY_MAX_BYTES` / runtime.toml
    /// when serving very large image edits.
    pub const DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES: usize = 25 * 1024 * 1024;
    /// Default maximum request body size for vendor file-upload endpoints.
    ///
    /// Applies to the paths that carry a binary object rather than a JSON
    /// prompt: `POST /v1/files`, `/v1/uploads`, `/v1/containers/{id}/files`,
    /// `/anthropic/v1/files` and `/google/v1beta/files`.
    ///
    /// OpenAI's Files API accepts a 512 MB object per request, which is an
    /// order of magnitude above the 25 MiB JSON budget, so the gate needs its
    /// own knob instead of widening every `/v1` route.
    ///
    /// The default intentionally equals the invocation budget: the intake still
    /// collects the whole body in memory (`invocation_body_from_http`), so a
    /// larger default would turn a single upload into a multi-hundred-megabyte
    /// allocation and a trivially reachable OOM. Operators align it with the
    /// vendor ceiling via `SDKWORK_CLOUDROUTER_GATEWAY_UPLOAD_BODY_MAX_BYTES`
    /// once multipart bodies are streamed instead of buffered; until then the
    /// honest ceiling is "what one request may hold in RAM".
    pub const DEFAULT_GATEWAY_UPLOAD_BODY_MAX_BYTES: usize = 25 * 1024 * 1024;
    /// Default outer HTTP backstop for one gateway request.
    ///
    /// The web framework's production default is 30 s, while the provider
    /// egress allows 60 s per hop plus retries and account failover. A backstop
    /// tighter than the inner budget turns every long non-streaming completion
    /// into a framework 408: the provider keeps generating (and bills) while the
    /// client sees an empty gateway error and the settlement after-chain never
    /// runs. 300 s also covers the header phase of a streamed completion: a
    /// streaming relay answers the client only after the provider sends its
    /// response headers, and that first byte may legitimately take minutes for a
    /// large prompt with extended thinking. Once both headers and body are on the
    /// wire, this value no longer bounds the response — the stream deadlines do.
    /// Raise it via `SDKWORK_CLOUDROUTER_GATEWAY_REQUEST_TIMEOUT_MILLIS` /
    /// runtime.toml when routing across many failover candidates.
    pub const DEFAULT_GATEWAY_REQUEST_TIMEOUT_MILLIS: u64 = 300_000;

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
            gateway_invocation_body_max_bytes: configured_usize_limit(
                Self::ENV_GATEWAY_INVOCATION_BODY_MAX_BYTES,
                runtime_toml
                    .and_then(|config| config.request_limits.gateway_invocation_body_max_bytes),
                Self::DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES,
            )?,
            gateway_upload_body_max_bytes: configured_usize_limit(
                Self::ENV_GATEWAY_UPLOAD_BODY_MAX_BYTES,
                runtime_toml
                    .and_then(|config| config.request_limits.gateway_upload_body_max_bytes),
                Self::DEFAULT_GATEWAY_UPLOAD_BODY_MAX_BYTES,
            )?,
            gateway_request_timeout_millis: configured_u64_limit(
                Self::ENV_GATEWAY_REQUEST_TIMEOUT_MILLIS,
                runtime_toml
                    .and_then(|config| config.request_limits.gateway_request_timeout_millis),
                Self::DEFAULT_GATEWAY_REQUEST_TIMEOUT_MILLIS,
            )?,
        })
    }

    pub fn admin_app_json_body_max_bytes(&self) -> usize {
        self.admin_app_json_body_max_bytes
    }

    pub fn admin_skill_json_body_max_bytes(&self) -> usize {
        self.admin_skill_json_body_max_bytes
    }

    pub fn gateway_invocation_body_max_bytes(&self) -> usize {
        self.gateway_invocation_body_max_bytes
    }

    /// Body ceiling for the vendor file-upload endpoints.
    pub fn gateway_upload_body_max_bytes(&self) -> usize {
        self.gateway_upload_body_max_bytes
    }

    pub fn gateway_request_timeout_millis(&self) -> u64 {
        self.gateway_request_timeout_millis
    }
}

impl Default for RequestLimitsConfig {
    fn default() -> Self {
        Self {
            admin_app_json_body_max_bytes: Self::DEFAULT_ADMIN_APP_JSON_BODY_MAX_BYTES,
            admin_skill_json_body_max_bytes: Self::DEFAULT_ADMIN_SKILL_JSON_BODY_MAX_BYTES,
            gateway_invocation_body_max_bytes: Self::DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES,
            gateway_upload_body_max_bytes: Self::DEFAULT_GATEWAY_UPLOAD_BODY_MAX_BYTES,
            gateway_request_timeout_millis: Self::DEFAULT_GATEWAY_REQUEST_TIMEOUT_MILLIS,
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

fn configured_u64_limit(
    name: &str,
    config_value: Option<u64>,
    default_value: u64,
) -> Result<u64, String> {
    let value = crate::runtime::config_u64(name, config_value)?.unwrap_or(default_value);
    if value == 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(value)
}
