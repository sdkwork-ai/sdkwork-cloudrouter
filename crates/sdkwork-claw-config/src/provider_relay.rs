use std::fmt;
use std::net::{IpAddr, ToSocketAddrs};

use url::Url;

#[derive(Clone, PartialEq, Eq)]
pub struct ProviderRelayConfig {
    openai_relay: Option<OpenAiRelayConfig>,
    provider_passthrough: Vec<ProviderPassthroughRelayConfig>,
}

#[derive(Clone, PartialEq, Eq)]
pub struct OpenAiRelayConfig {
    base_url: String,
    bearer_token: String,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ProviderPassthroughRelayConfig {
    provider: String,
    base_url: String,
    auth: ProviderPassthroughAuth,
    default_headers: Vec<ProviderPassthroughHeader>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ProviderPassthroughAuthType {
    Bearer,
    Header,
    Query,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ProviderPassthroughAuth {
    auth_type: ProviderPassthroughAuthType,
    name: Option<String>,
    value: String,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ProviderPassthroughHeader {
    name: String,
    value: String,
}

impl ProviderRelayConfig {
    pub const ENV_OPENAI_RELAY_BASE_URL: &'static str = "SDKWORK_CLAW_OPENAI_RELAY_BASE_URL";
    pub const ENV_OPENAI_RELAY_BEARER_TOKEN: &'static str =
        "SDKWORK_CLAW_OPENAI_RELAY_BEARER_TOKEN";
    pub const ENV_PROVIDER_PASSTHROUGH_JSON: &'static str =
        "SDKWORK_CLAW_PROVIDER_PASSTHROUGH_JSON";

    pub fn from_optional_parts(
        openai_base_url: Option<String>,
        openai_bearer_token: Option<String>,
    ) -> Result<Option<Self>, String> {
        match (openai_base_url, openai_bearer_token) {
            (None, None) => Ok(None),
            (Some(base_url), Some(bearer_token)) => {
                Self::from_parts(base_url, bearer_token).map(Some)
            }
            (Some(_), None) => Err(format!(
                "{} is required when {} is set",
                Self::ENV_OPENAI_RELAY_BEARER_TOKEN,
                Self::ENV_OPENAI_RELAY_BASE_URL
            )),
            (None, Some(_)) => Err(format!(
                "{} is required when {} is set",
                Self::ENV_OPENAI_RELAY_BASE_URL,
                Self::ENV_OPENAI_RELAY_BEARER_TOKEN
            )),
        }
    }

    pub fn from_parts(
        openai_base_url: impl Into<String>,
        openai_bearer_token: impl Into<String>,
    ) -> Result<Self, String> {
        Ok(Self {
            openai_relay: Some(OpenAiRelayConfig::from_parts(
                openai_base_url,
                openai_bearer_token,
            )?),
            provider_passthrough: Vec::new(),
        })
    }

    pub fn from_provider_passthrough_json(
        passthrough_json: impl AsRef<str>,
    ) -> Result<Self, String> {
        Self {
            openai_relay: None,
            provider_passthrough: Vec::new(),
        }
        .with_provider_passthrough_json(passthrough_json)
    }

    pub fn from_env() -> Result<Option<Self>, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        let openai_relay = Self::from_optional_parts(
            crate::runtime::config_value(
                Self::ENV_OPENAI_RELAY_BASE_URL,
                runtime_toml.and_then(|config| config.provider_relay.openai.base_url.as_deref()),
            ),
            crate::runtime::config_secret_value(
                Self::ENV_OPENAI_RELAY_BEARER_TOKEN,
                "SDKWORK_CLAW_OPENAI_RELAY_BEARER_TOKEN_FILE",
                runtime_toml
                    .and_then(|config| config.provider_relay.openai.bearer_token.as_deref()),
                runtime_toml
                    .and_then(|config| config.provider_relay.openai.bearer_token_file.as_deref()),
            )?,
        )?;
        let provider_passthrough_json =
            crate::runtime::env_optional(Self::ENV_PROVIDER_PASSTHROUGH_JSON);
        let mut config: Option<Self> = match (openai_relay, provider_passthrough_json) {
            (None, None) => None,
            (Some(config), None) => Some(config),
            (Some(config), Some(json)) => Some(config.with_provider_passthrough_json(json)?),
            (None, Some(json)) => Some(Self::from_provider_passthrough_json(json)?),
        };

        let Some(runtime_toml) = runtime_toml else {
            return Ok(config);
        };
        for (provider, passthrough) in &runtime_toml.provider_relay.passthrough {
            let base_url = match crate::runtime::config_value("", passthrough.base_url.as_deref()) {
                Some(value) => value,
                None => continue,
            };
            let auth_value = crate::runtime::config_secret_value(
                "",
                &format!("runtime config [provider_relay.passthrough.{provider}].auth_value_file"),
                passthrough
                    .auth_value
                    .as_deref()
                    .or(passthrough.bearer_token.as_deref()),
                passthrough
                    .auth_value_file
                    .as_deref()
                    .or(passthrough.bearer_token_file.as_deref()),
            )?
            .ok_or_else(|| {
                format!("runtime config [provider_relay.passthrough.{provider}] requires auth_value, auth_value_file, bearer_token, or bearer_token_file")
            })?;
            let auth = match passthrough
                .auth_type
                .as_deref()
                .unwrap_or("bearer")
                .trim()
                .to_ascii_lowercase()
                .as_str()
            {
                "bearer" => ProviderPassthroughAuth::bearer(auth_value)?,
                "header" => ProviderPassthroughAuth::header(
                    passthrough.auth_name.as_deref().ok_or_else(|| {
                        format!("runtime config [provider_relay.passthrough.{provider}].auth_name is required when auth_type is header")
                    })?,
                    auth_value,
                )?,
                "query" => ProviderPassthroughAuth::query(
                    passthrough.auth_name.as_deref().ok_or_else(|| {
                        format!("runtime config [provider_relay.passthrough.{provider}].auth_name is required when auth_type is query")
                    })?,
                    auth_value,
                )?,
                other => {
                    return Err(format!(
                        "runtime config [provider_relay.passthrough.{provider}].auth_type must be bearer, header, or query: {other}"
                    ))
                }
            };
            let default_headers = passthrough
                .default_headers
                .iter()
                .map(|(name, value)| ProviderPassthroughHeader::new(name, value))
                .collect::<Result<Vec<_>, _>>()?;
            let target = ProviderPassthroughRelayConfig::from_parts_with_auth_and_default_headers(
                provider,
                base_url,
                auth,
                default_headers,
            )?;
            let relay = config.get_or_insert_with(|| Self {
                openai_relay: None,
                provider_passthrough: Vec::new(),
            });
            if let Some(existing) = relay
                .provider_passthrough
                .iter_mut()
                .find(|existing| existing.provider == target.provider)
            {
                *existing = target;
            } else {
                relay.provider_passthrough.push(target);
            }
        }
        Ok(config)
    }

    pub fn openai_relay(&self) -> Option<&OpenAiRelayConfig> {
        self.openai_relay.as_ref()
    }

    pub fn with_provider_passthrough(
        mut self,
        provider: impl Into<String>,
        base_url: impl Into<String>,
        bearer_token: impl Into<String>,
    ) -> Result<Self, String> {
        let config = ProviderPassthroughRelayConfig::from_parts(provider, base_url, bearer_token)?;
        if let Some(existing) = self
            .provider_passthrough
            .iter_mut()
            .find(|existing| existing.provider == config.provider)
        {
            *existing = config;
        } else {
            self.provider_passthrough.push(config);
        }
        Ok(self)
    }

    pub fn with_provider_passthrough_auth(
        mut self,
        provider: impl Into<String>,
        base_url: impl Into<String>,
        auth: ProviderPassthroughAuth,
    ) -> Result<Self, String> {
        let config =
            ProviderPassthroughRelayConfig::from_parts_with_auth(provider, base_url, auth)?;
        if let Some(existing) = self
            .provider_passthrough
            .iter_mut()
            .find(|existing| existing.provider == config.provider)
        {
            *existing = config;
        } else {
            self.provider_passthrough.push(config);
        }
        Ok(self)
    }

    pub fn with_provider_passthrough_json(
        mut self,
        passthrough_json: impl AsRef<str>,
    ) -> Result<Self, String> {
        let passthrough_json = passthrough_json.as_ref().trim();
        if passthrough_json.is_empty() {
            return Err(format!(
                "{} must not be blank",
                Self::ENV_PROVIDER_PASSTHROUGH_JSON
            ));
        }
        let value: serde_json::Value = serde_json::from_str(passthrough_json).map_err(|error| {
            format!(
                "{} must be a JSON object mapping provider code to passthrough relay config: {error}",
                Self::ENV_PROVIDER_PASSTHROUGH_JSON
            )
        })?;
        let object = value.as_object().ok_or_else(|| {
            format!(
                "{} must be a JSON object mapping provider code to passthrough relay config",
                Self::ENV_PROVIDER_PASSTHROUGH_JSON
            )
        })?;
        for (provider, config) in object {
            let config_object = config.as_object().ok_or_else(|| {
                format!(
                    "{} provider {provider} must be an object",
                    Self::ENV_PROVIDER_PASSTHROUGH_JSON
                )
            })?;
            let base_url = config_object
                .get("baseUrl")
                .and_then(serde_json::Value::as_str)
                .ok_or_else(|| {
                    format!(
                        "{} provider {provider}.baseUrl is required",
                        Self::ENV_PROVIDER_PASSTHROUGH_JSON
                    )
                })?;
            let auth = parse_provider_passthrough_auth(provider, config_object)?;
            let default_headers =
                parse_provider_passthrough_default_headers(provider, config_object)?;
            let config = ProviderPassthroughRelayConfig::from_parts_with_auth_and_default_headers(
                provider,
                base_url,
                auth,
                default_headers,
            )?;
            if let Some(existing) = self
                .provider_passthrough
                .iter_mut()
                .find(|existing| existing.provider == config.provider)
            {
                *existing = config;
            } else {
                self.provider_passthrough.push(config);
            }
        }
        Ok(self)
    }

    pub fn provider_passthrough(&self, provider: &str) -> Option<&ProviderPassthroughRelayConfig> {
        let provider = provider.trim();
        self.provider_passthrough
            .iter()
            .find(|config| config.provider == provider)
    }

    pub fn provider_passthrough_targets(&self) -> &[ProviderPassthroughRelayConfig] {
        &self.provider_passthrough
    }
}

impl OpenAiRelayConfig {
    pub fn from_parts(
        base_url: impl Into<String>,
        bearer_token: impl Into<String>,
    ) -> Result<Self, String> {
        let base_url = base_url.into().trim().trim_end_matches('/').to_owned();
        if base_url.is_empty() {
            return Err(format!(
                "{} must not be blank",
                ProviderRelayConfig::ENV_OPENAI_RELAY_BASE_URL
            ));
        }
        validate_base_url_ssrf(&base_url)?;
        let bearer_token = bearer_token.into().trim().to_owned();
        if bearer_token.is_empty() {
            return Err(format!(
                "{} must not be blank",
                ProviderRelayConfig::ENV_OPENAI_RELAY_BEARER_TOKEN
            ));
        }
        Ok(Self {
            base_url,
            bearer_token,
        })
    }

    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    pub fn bearer_token(&self) -> &str {
        &self.bearer_token
    }
}

impl ProviderPassthroughRelayConfig {
    pub fn from_parts(
        provider: impl Into<String>,
        base_url: impl Into<String>,
        bearer_token: impl Into<String>,
    ) -> Result<Self, String> {
        Self::from_parts_with_auth(
            provider,
            base_url,
            ProviderPassthroughAuth::bearer(bearer_token)?,
        )
    }

    pub fn from_parts_with_auth(
        provider: impl Into<String>,
        base_url: impl Into<String>,
        auth: ProviderPassthroughAuth,
    ) -> Result<Self, String> {
        Self::from_parts_with_auth_and_default_headers(provider, base_url, auth, Vec::new())
    }

    pub fn from_parts_with_auth_and_default_headers(
        provider: impl Into<String>,
        base_url: impl Into<String>,
        auth: ProviderPassthroughAuth,
        default_headers: Vec<ProviderPassthroughHeader>,
    ) -> Result<Self, String> {
        let provider = provider.into().trim().to_owned();
        if provider.is_empty() {
            return Err("provider passthrough code must not be blank".to_owned());
        }
        let base_url = base_url.into().trim().trim_end_matches('/').to_owned();
        if base_url.is_empty() {
            return Err("provider passthrough base URL must not be blank".to_owned());
        }
        validate_base_url_ssrf(&base_url)?;
        Ok(Self {
            provider,
            base_url,
            auth,
            default_headers,
        })
    }

    pub fn provider(&self) -> &str {
        &self.provider
    }

    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    pub fn bearer_token(&self) -> &str {
        self.auth.value()
    }

    pub fn auth(&self) -> &ProviderPassthroughAuth {
        &self.auth
    }

    pub fn default_headers(&self) -> &[ProviderPassthroughHeader] {
        &self.default_headers
    }
}

impl ProviderPassthroughAuth {
    pub fn bearer(value: impl Into<String>) -> Result<Self, String> {
        let value = value.into().trim().to_owned();
        if value.is_empty() {
            return Err("provider passthrough bearer token must not be blank".to_owned());
        }
        Ok(Self {
            auth_type: ProviderPassthroughAuthType::Bearer,
            name: None,
            value,
        })
    }

    pub fn header(name: impl Into<String>, value: impl Into<String>) -> Result<Self, String> {
        Self::named(ProviderPassthroughAuthType::Header, name, value)
    }

    pub fn query(name: impl Into<String>, value: impl Into<String>) -> Result<Self, String> {
        Self::named(ProviderPassthroughAuthType::Query, name, value)
    }

    fn named(
        auth_type: ProviderPassthroughAuthType,
        name: impl Into<String>,
        value: impl Into<String>,
    ) -> Result<Self, String> {
        let name = name.into().trim().to_owned();
        if name.is_empty() {
            return Err("provider passthrough auth.name must not be blank".to_owned());
        }
        let value = value.into().trim().to_owned();
        if value.is_empty() {
            return Err("provider passthrough auth.value must not be blank".to_owned());
        }
        Ok(Self {
            auth_type,
            name: Some(name),
            value,
        })
    }

    pub fn auth_type(&self) -> ProviderPassthroughAuthType {
        self.auth_type.clone()
    }

    pub fn name(&self) -> Option<&str> {
        self.name.as_deref()
    }

    pub fn value(&self) -> &str {
        &self.value
    }
}

impl ProviderPassthroughHeader {
    pub fn new(name: impl Into<String>, value: impl Into<String>) -> Result<Self, String> {
        let name = normalize_provider_passthrough_default_header_name(name)?;
        let value = value.into().trim().to_owned();
        if value.is_empty() {
            return Err(format!(
                "provider passthrough defaultHeaders.{name} must not be blank"
            ));
        }
        if value.bytes().any(|byte| matches!(byte, 0..=31 | 127)) {
            return Err(format!(
                "provider passthrough defaultHeaders.{name} contains an invalid header value"
            ));
        }
        Ok(Self { name, value })
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn value(&self) -> &str {
        &self.value
    }
}

fn parse_provider_passthrough_auth(
    provider: &str,
    config_object: &serde_json::Map<String, serde_json::Value>,
) -> Result<ProviderPassthroughAuth, String> {
    if let Some(auth) = config_object.get("auth") {
        let auth = auth.as_object().ok_or_else(|| {
            format!(
                "{} provider {provider}.auth must be an object",
                ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON
            )
        })?;
        let auth_type = auth
            .get("type")
            .and_then(serde_json::Value::as_str)
            .ok_or_else(|| {
                format!(
                    "{} provider {provider}.auth.type is required",
                    ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON
                )
            })?
            .trim();
        let value = auth
            .get("value")
            .and_then(serde_json::Value::as_str)
            .ok_or_else(|| {
                format!(
                    "{} provider {provider}.auth.value is required",
                    ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON
                )
            })?;
        return match auth_type {
            "bearer" => ProviderPassthroughAuth::bearer(value),
            "header" => {
                let name = auth
                    .get("name")
                    .and_then(serde_json::Value::as_str)
                    .ok_or_else(|| {
                        format!(
                            "{} provider {provider}.auth.name is required",
                            ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON
                        )
                    })?;
                ProviderPassthroughAuth::header(name, value)
            }
            "query" => {
                let name = auth
                    .get("name")
                    .and_then(serde_json::Value::as_str)
                    .ok_or_else(|| {
                        format!(
                            "{} provider {provider}.auth.name is required",
                            ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON
                        )
                    })?;
                ProviderPassthroughAuth::query(name, value)
            }
            _ => Err(format!(
                "{} provider {provider}.auth.type must be bearer, header, or query",
                ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON
            )),
        };
    }

    let bearer_token = config_object
        .get("bearerToken")
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| {
            format!(
                "{} provider {provider}.bearerToken or auth is required",
                ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON
            )
        })?;
    ProviderPassthroughAuth::bearer(bearer_token)
}

fn parse_provider_passthrough_default_headers(
    provider: &str,
    config_object: &serde_json::Map<String, serde_json::Value>,
) -> Result<Vec<ProviderPassthroughHeader>, String> {
    let Some(default_headers) = config_object.get("defaultHeaders") else {
        return Ok(Vec::new());
    };
    let object = default_headers.as_object().ok_or_else(|| {
        format!(
            "{} provider {provider}.defaultHeaders must be an object",
            ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON
        )
    })?;
    let mut headers = object
        .iter()
        .map(|(name, value)| {
            let value = value.as_str().ok_or_else(|| {
                format!(
                    "{} provider {provider}.defaultHeaders.{name} must be a string",
                    ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON
                )
            })?;
            ProviderPassthroughHeader::new(name, value)
        })
        .collect::<Result<Vec<_>, _>>()?;
    headers.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(headers)
}

fn normalize_provider_passthrough_default_header_name(
    name: impl Into<String>,
) -> Result<String, String> {
    let name = name.into().trim().to_ascii_lowercase();
    if name.is_empty() {
        return Err("provider passthrough defaultHeaders header name must not be blank".to_owned());
    }
    if !name.bytes().all(is_http_header_name_byte) {
        return Err(format!(
            "provider passthrough defaultHeaders.{name} contains an invalid header name"
        ));
    }
    if is_reserved_provider_passthrough_default_header(name.as_str()) {
        return Err(format!(
            "provider passthrough defaultHeaders.{name} is reserved and must be configured through auth or router transport settings"
        ));
    }
    Ok(name)
}

fn is_http_header_name_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric()
        || matches!(
            byte,
            b'!' | b'#'
                | b'$'
                | b'%'
                | b'&'
                | b'\''
                | b'*'
                | b'+'
                | b'-'
                | b'.'
                | b'^'
                | b'_'
                | b'`'
                | b'|'
                | b'~'
        )
}

fn is_reserved_provider_passthrough_default_header(name: &str) -> bool {
    matches!(
        name,
        "authorization"
            | "proxy-authorization"
            | "x-api-key"
            | "x-goog-api-key"
            | "host"
            | "content-length"
            | "connection"
            | "keep-alive"
            | "te"
            | "trailer"
            | "transfer-encoding"
            | "upgrade"
            | "forwarded"
            | "x-forwarded-host"
            | "x-forwarded-proto"
            | "x-forwarded-for"
            | "x-real-ip"
    )
}

impl fmt::Debug for ProviderRelayConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ProviderRelayConfig")
            .field("openai_relay", &self.openai_relay)
            .field("provider_passthrough", &self.provider_passthrough)
            .finish()
    }
}

impl fmt::Debug for OpenAiRelayConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OpenAiRelayConfig")
            .field("base_url", &self.base_url)
            .field("bearer_token", &"[REDACTED]")
            .finish()
    }
}

impl fmt::Debug for ProviderPassthroughRelayConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ProviderPassthroughRelayConfig")
            .field("provider", &self.provider)
            .field("base_url", &self.base_url)
            .field("auth", &self.auth)
            .field("default_headers", &self.default_headers)
            .finish()
    }
}

impl fmt::Debug for ProviderPassthroughAuth {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ProviderPassthroughAuth")
            .field("auth_type", &self.auth_type)
            .field("name", &self.name)
            .field("value", &"[REDACTED]")
            .finish()
    }
}

impl fmt::Debug for ProviderPassthroughHeader {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ProviderPassthroughHeader")
            .field("name", &self.name)
            .field("value", &"[REDACTED]")
            .finish()
    }
}

/// Validate that `base_url` is an absolute HTTPS URL whose host does not
/// resolve to a private, loopback, link-local, carrier-grade NAT, or
/// unspecified address. IP literals are checked directly; domain names are
/// resolved and each resolved IP is checked. DNS resolution failures are
/// allowed because the connector layer re-validates at request time
/// (defense-in-depth per OWASP SSRF Prevention Cheat Sheet).
fn validate_base_url_ssrf(base_url: &str) -> Result<(), String> {
    let url = Url::parse(base_url).map_err(|error| {
        format!("provider relay base URL must be a valid absolute URL: {error}")
    })?;
    if url.scheme() != "https" {
        return Err(format!(
            "provider relay base URL must use https scheme (got `{}`)",
            url.scheme()
        ));
    }
    let host = url
        .host_str()
        .ok_or_else(|| "provider relay base URL must have a host".to_owned())?;
    if host.is_empty() {
        return Err("provider relay base URL must have a host".to_owned());
    }
    let addresses: Vec<IpAddr> = match url.host() {
        Some(url::Host::Ipv4(ip)) => vec![IpAddr::V4(ip)],
        Some(url::Host::Ipv6(ip)) => vec![IpAddr::V6(ip)],
        _ => format!("{host}:443")
            .to_socket_addrs()
            .map(|addrs| addrs.map(|a| a.ip()).collect())
            .unwrap_or_default(),
    };
    for ip in addresses {
        if let Some(reason) = ssrf_block_reason(&ip) {
            return Err(format!(
                "provider relay base URL host `{host}` resolves to {reason} ({ip})"
            ));
        }
    }
    Ok(())
}

/// Return the human-readable block reason for an IP, or `None` if the IP is
/// publicly routable and therefore allowed.
fn ssrf_block_reason(ip: &IpAddr) -> Option<&'static str> {
    match ip {
        IpAddr::V4(v4) => {
            if v4.is_loopback() {
                return Some("loopback address 127.0.0.0/8");
            }
            if v4.is_private() {
                return Some("private address 10.0.0.0/8, 172.16.0.0/12 or 192.168.0.0/16");
            }
            if v4.is_link_local() {
                // 169.254.0.0/16 includes the cloud metadata service.
                return Some("link-local address 169.254.0.0/16");
            }
            if v4.is_unspecified() {
                return Some("unspecified address 0.0.0.0/8");
            }
            let octets = v4.octets();
            // Carrier-grade NAT 100.64.0.0/10 (not covered by std is_private).
            if octets[0] == 100 && (octets[1] & 0xc0) == 64 {
                return Some("carrier-grade NAT address 100.64.0.0/10");
            }
            None
        }
        IpAddr::V6(v6) => {
            if v6.is_loopback() {
                return Some("IPv6 loopback address ::1/128");
            }
            if v6.is_unspecified() {
                return Some("IPv6 unspecified address ::/128");
            }
            let segments = v6.segments();
            // IPv6 unique local addresses fc00::/7.
            if (segments[0] & 0xfe00) == 0xfc00 {
                return Some("IPv6 unique local address fc00::/7");
            }
            // IPv6 link-local addresses fe80::/10.
            if (segments[0] & 0xffc0) == 0xfe80 {
                return Some("IPv6 link-local address fe80::/10");
            }
            None
        }
    }
}
