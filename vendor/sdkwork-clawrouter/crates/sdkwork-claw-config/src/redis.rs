use std::fmt;

#[derive(Clone, PartialEq, Eq)]
pub struct RedisConfig {
    url: String,
    host: Option<String>,
    port: Option<u16>,
    database: Option<u32>,
    username: Option<String>,
    password: Option<String>,
    key_prefix: Option<String>,
    tls: bool,
    max_connections: u32,
    connect_timeout_millis: u64,
    command_timeout_millis: u64,
    pool_idle_timeout_seconds: u64,
}

impl RedisConfig {
    pub const ENV_REDIS_ENABLED: &'static str = "SDKWORK_CLAW_REDIS_ENABLED";
    pub const ENV_REDIS_HOST: &'static str = "SDKWORK_CLAW_REDIS_HOST";
    pub const ENV_REDIS_PORT: &'static str = "SDKWORK_CLAW_REDIS_PORT";
    pub const ENV_REDIS_DATABASE: &'static str = "SDKWORK_CLAW_REDIS_DATABASE";
    pub const ENV_REDIS_USERNAME: &'static str = "SDKWORK_CLAW_REDIS_USERNAME";
    pub const ENV_REDIS_URL: &'static str = "SDKWORK_CLAW_REDIS_URL";
    pub const ENV_REDIS_PASSWORD: &'static str = "SDKWORK_CLAW_REDIS_PASSWORD";
    pub const ENV_REDIS_PASSWORD_FILE: &'static str = "SDKWORK_CLAW_REDIS_PASSWORD_FILE";
    pub const ENV_REDIS_KEY_PREFIX: &'static str = "SDKWORK_CLAW_REDIS_KEY_PREFIX";
    pub const ENV_REDIS_TLS: &'static str = "SDKWORK_CLAW_REDIS_TLS";
    pub const ENV_REDIS_MAX_CONNECTIONS: &'static str = "SDKWORK_CLAW_REDIS_MAX_CONNECTIONS";
    pub const ENV_REDIS_CONNECT_TIMEOUT_MILLIS: &'static str =
        "SDKWORK_CLAW_REDIS_CONNECT_TIMEOUT_MILLIS";
    pub const ENV_REDIS_COMMAND_TIMEOUT_MILLIS: &'static str =
        "SDKWORK_CLAW_REDIS_COMMAND_TIMEOUT_MILLIS";
    pub const ENV_REDIS_POOL_IDLE_TIMEOUT_SECONDS: &'static str =
        "SDKWORK_CLAW_REDIS_POOL_IDLE_TIMEOUT_SECONDS";

    pub const DEFAULT_PORT: u16 = 6379;
    pub const DEFAULT_DATABASE: u32 = 0;
    pub const DEFAULT_TLS: bool = false;
    pub const DEFAULT_MAX_CONNECTIONS: u32 = 16;
    pub const DEFAULT_CONNECT_TIMEOUT_MILLIS: u64 = 2_000;
    pub const DEFAULT_COMMAND_TIMEOUT_MILLIS: u64 = 1_000;
    pub const DEFAULT_POOL_IDLE_TIMEOUT_SECONDS: u64 = 60;

    pub fn from_env() -> Result<Option<Self>, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        Self::from_env_or_runtime_toml_with_default_enabled(runtime_toml, false)
    }

    pub fn from_env_or_runtime_toml_with_default_enabled(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
        default_enabled: bool,
    ) -> Result<Option<Self>, String> {
        let section = runtime_toml.map(|config| &config.redis);
        let enabled = crate::runtime::config_bool(
            Self::ENV_REDIS_ENABLED,
            section.and_then(|section| section.enabled),
        )?
        .unwrap_or(default_enabled);
        if !enabled {
            return Ok(None);
        }

        let url = crate::runtime::config_value(
            Self::ENV_REDIS_URL,
            section.and_then(|section| section.url.as_deref()),
        );
        let host = crate::runtime::config_value(
            Self::ENV_REDIS_HOST,
            section.and_then(|section| section.host.as_deref()),
        );
        let port = config_u16(
            Self::ENV_REDIS_PORT,
            section.and_then(|section| section.port),
        )?;
        let database = crate::runtime::config_u32(
            Self::ENV_REDIS_DATABASE,
            section.and_then(|section| section.database),
        )?;
        let username = crate::runtime::config_value(
            Self::ENV_REDIS_USERNAME,
            section.and_then(|section| section.username.as_deref()),
        );
        let password = crate::runtime::config_secret_value(
            Self::ENV_REDIS_PASSWORD,
            Self::ENV_REDIS_PASSWORD_FILE,
            section.and_then(|section| section.password.as_deref()),
            section.and_then(|section| section.password_file.as_deref()),
        )?;
        let key_prefix = crate::runtime::config_value(
            Self::ENV_REDIS_KEY_PREFIX,
            section.and_then(|section| section.key_prefix.as_deref()),
        );
        let tls = crate::runtime::config_bool(
            Self::ENV_REDIS_TLS,
            section.and_then(|section| section.tls),
        )?;
        let max_connections = positive_u32(
            "Redis max connections",
            crate::runtime::config_u32(
                Self::ENV_REDIS_MAX_CONNECTIONS,
                section.and_then(|section| section.max_connections),
            )?
            .unwrap_or(Self::DEFAULT_MAX_CONNECTIONS),
        )?;
        let connect_timeout_millis = positive_u64(
            "Redis connect timeout millis",
            crate::runtime::config_u64(
                Self::ENV_REDIS_CONNECT_TIMEOUT_MILLIS,
                section.and_then(|section| section.connect_timeout_millis),
            )?
            .unwrap_or(Self::DEFAULT_CONNECT_TIMEOUT_MILLIS),
        )?;
        let command_timeout_millis = positive_u64(
            "Redis command timeout millis",
            crate::runtime::config_u64(
                Self::ENV_REDIS_COMMAND_TIMEOUT_MILLIS,
                section.and_then(|section| section.command_timeout_millis),
            )?
            .unwrap_or(Self::DEFAULT_COMMAND_TIMEOUT_MILLIS),
        )?;
        let pool_idle_timeout_seconds = positive_u64(
            "Redis pool idle timeout seconds",
            crate::runtime::config_u64(
                Self::ENV_REDIS_POOL_IDLE_TIMEOUT_SECONDS,
                section.and_then(|section| section.pool_idle_timeout_seconds),
            )?
            .unwrap_or(Self::DEFAULT_POOL_IDLE_TIMEOUT_SECONDS),
        )?;

        let config = match url {
            Some(url) => Self::from_url_parts(
                url,
                host,
                port,
                database,
                username,
                password,
                key_prefix,
                tls,
                max_connections,
                connect_timeout_millis,
                command_timeout_millis,
                pool_idle_timeout_seconds,
            )?,
            None => Self::from_structured_parts(
                host,
                port,
                database,
                username,
                password,
                key_prefix,
                tls.unwrap_or(Self::DEFAULT_TLS),
                max_connections,
                connect_timeout_millis,
                command_timeout_millis,
                pool_idle_timeout_seconds,
            )?,
        };
        Ok(Some(config))
    }

    #[allow(clippy::too_many_arguments)]
    fn from_url_parts(
        url: String,
        host: Option<String>,
        port: Option<u16>,
        database: Option<u32>,
        username: Option<String>,
        password: Option<String>,
        key_prefix: Option<String>,
        tls: Option<bool>,
        max_connections: u32,
        connect_timeout_millis: u64,
        command_timeout_millis: u64,
        pool_idle_timeout_seconds: u64,
    ) -> Result<Self, String> {
        if host.is_some() || port.is_some() || database.is_some() || username.is_some() {
            return Err(
                "runtime config [redis] must use either url or structured host/port/database fields, not both"
                    .to_owned(),
            );
        }
        if password.is_some() {
            return Err(
                "runtime config [redis] must not combine url with password or password_file"
                    .to_owned(),
            );
        }
        let url = normalize_redis_url(&url)?;
        let url_uses_tls = redis_url_uses_tls(&url);
        if let Some(tls) = tls {
            if tls && !url_uses_tls {
                return Err(
                    "runtime config [redis] tls is enabled but url uses redis:// (non-TLS); use rediss:// or disable tls"
                        .to_owned(),
                );
            }
            if !tls && url_uses_tls {
                return Err(
                    "runtime config [redis] tls is disabled but url uses rediss:// (TLS); use redis:// or enable tls"
                        .to_owned(),
                );
            }
        }
        Ok(Self {
            tls: url_uses_tls,
            url,
            host: None,
            port: None,
            database: None,
            username: None,
            password: None,
            key_prefix,
            max_connections,
            connect_timeout_millis,
            command_timeout_millis,
            pool_idle_timeout_seconds,
        })
    }

    #[allow(clippy::too_many_arguments)]
    fn from_structured_parts(
        host: Option<String>,
        port: Option<u16>,
        database: Option<u32>,
        username: Option<String>,
        password: Option<String>,
        key_prefix: Option<String>,
        tls: bool,
        max_connections: u32,
        connect_timeout_millis: u64,
        command_timeout_millis: u64,
        pool_idle_timeout_seconds: u64,
    ) -> Result<Self, String> {
        let host = required_value("runtime config [redis].host", host)?;
        let port = port.unwrap_or(Self::DEFAULT_PORT);
        let database = database.unwrap_or(Self::DEFAULT_DATABASE);
        let url = structured_redis_url(
            &host,
            port,
            database,
            username.as_deref(),
            password.as_deref(),
            tls,
        )?;
        Ok(Self {
            url,
            host: Some(host),
            port: Some(port),
            database: Some(database),
            username,
            password,
            key_prefix,
            tls,
            max_connections,
            connect_timeout_millis,
            command_timeout_millis,
            pool_idle_timeout_seconds,
        })
    }

    pub fn enabled(&self) -> bool {
        true
    }

    pub fn url(&self) -> &str {
        &self.url
    }

    pub fn host(&self) -> Option<&str> {
        self.host.as_deref()
    }

    pub fn port(&self) -> Option<u16> {
        self.port
    }

    pub fn database(&self) -> Option<u32> {
        self.database
    }

    pub fn username(&self) -> Option<&str> {
        self.username.as_deref()
    }

    pub fn password(&self) -> Option<&str> {
        self.password.as_deref()
    }

    pub fn key_prefix(&self) -> Option<&str> {
        self.key_prefix.as_deref()
    }

    pub fn tls(&self) -> bool {
        self.tls
    }

    pub fn max_connections(&self) -> u32 {
        self.max_connections
    }

    pub fn connect_timeout_millis(&self) -> u64 {
        self.connect_timeout_millis
    }

    pub fn command_timeout_millis(&self) -> u64 {
        self.command_timeout_millis
    }

    pub fn pool_idle_timeout_seconds(&self) -> u64 {
        self.pool_idle_timeout_seconds
    }
}

impl fmt::Debug for RedisConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("RedisConfig")
            .field("url", &redact_redis_url(&self.url))
            .field("host", &self.host)
            .field("port", &self.port)
            .field("database", &self.database)
            .field("username", &self.username)
            .field("password", &self.password.as_ref().map(|_| "[REDACTED]"))
            .field("key_prefix", &self.key_prefix)
            .field("tls", &self.tls)
            .field("max_connections", &self.max_connections)
            .field("connect_timeout_millis", &self.connect_timeout_millis)
            .field("command_timeout_millis", &self.command_timeout_millis)
            .field("pool_idle_timeout_seconds", &self.pool_idle_timeout_seconds)
            .finish()
    }
}

fn config_u16(name: &str, config_value: Option<u16>) -> Result<Option<u16>, String> {
    match crate::runtime::env_optional(name) {
        Some(value) => value
            .parse::<u16>()
            .map(Some)
            .map_err(|_| format!("{name} must be a valid TCP port")),
        None => Ok(config_value),
    }
}

fn normalize_redis_url(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("runtime config [redis].url must not be blank".to_owned());
    }
    let url = url::Url::parse(trimmed)
        .map_err(|error| format!("runtime config [redis].url is invalid: {error}"))?;
    if !matches!(url.scheme(), "redis" | "rediss") {
        return Err("runtime config [redis].url must use redis:// or rediss://".to_owned());
    }
    if url.host_str().is_none() {
        return Err("runtime config [redis].url must include a host".to_owned());
    }
    Ok(trimmed.to_owned())
}

fn redis_url_uses_tls(url: &str) -> bool {
    url.trim()
        .get(..6)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("rediss"))
}

fn structured_redis_url(
    host: &str,
    port: u16,
    database: u32,
    username: Option<&str>,
    password: Option<&str>,
    tls: bool,
) -> Result<String, String> {
    let host = required_value("runtime config [redis].host", Some(host.to_owned()))?;
    let scheme = if tls { "rediss" } else { "redis" };
    let mut url = url::Url::parse(&format!("{scheme}://localhost"))
        .map_err(|error| format!("failed to initialize Redis URL: {error}"))?;
    url.set_host(Some(host.as_str()))
        .map_err(|_| format!("runtime config [redis].host is not valid: {host}"))?;
    url.set_port(Some(port))
        .map_err(|_| format!("runtime config [redis].port is not valid: {port}"))?;
    url.set_path(database.to_string().as_str());
    if let Some(username) = username {
        let username =
            required_value("runtime config [redis].username", Some(username.to_owned()))?;
        url.set_username(username.as_str()).map_err(|_| {
            "runtime config [redis].username cannot be represented in a Redis URL".to_owned()
        })?;
    }
    if let Some(password) = password {
        let password =
            required_value("runtime config [redis].password", Some(password.to_owned()))?;
        url.set_password(Some(password.as_str())).map_err(|_| {
            "runtime config [redis].password cannot be represented in a Redis URL".to_owned()
        })?;
    }
    Ok(url.to_string())
}

fn required_value(label: &str, value: Option<String>) -> Result<String, String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("{label} is required"))
}

fn positive_u32(label: &str, value: u32) -> Result<u32, String> {
    if value == 0 {
        return Err(format!("{label} must be greater than 0"));
    }
    Ok(value)
}

fn positive_u64(label: &str, value: u64) -> Result<u64, String> {
    if value == 0 {
        return Err(format!("{label} must be greater than 0"));
    }
    Ok(value)
}

fn redact_redis_url(value: &str) -> String {
    let Ok(mut url) = url::Url::parse(value) else {
        return "[REDACTED_URL]".to_owned();
    };
    if url.password().is_some() {
        let _ = url.set_password(Some("[REDACTED]"));
    }
    url.to_string()
}

/// Server production and staging profiles must enable Redis for distributed gateway rate limiting.
pub fn ensure_server_production_redis_config(
    deployment_mode: crate::DeploymentMode,
    runtime_toml: Option<&crate::RuntimeTomlConfig>,
) -> Result<(), String> {
    use crate::DeploymentMode;

    if deployment_mode == DeploymentMode::Desktop {
        return Ok(());
    }
    let environment = runtime_toml
        .and_then(|config| config.install.environment.as_deref())
        .unwrap_or("development")
        .trim()
        .to_ascii_lowercase();
    if environment != "production" && environment != "prod" && environment != "staging" {
        return Ok(());
    }
    match RedisConfig::from_env_or_runtime_toml_with_default_enabled(runtime_toml, true) {
        Ok(Some(config)) if config.enabled() => Ok(()),
        Ok(None) | Ok(Some(_)) => Err(
            "server production/staging deployment requires [redis] enabled with a valid connection profile (url or host/port)"
                .to_owned(),
        ),
        Err(error) => Err(format!(
            "server production/staging deployment requires valid [redis] configuration: {error}"
        )),
    }
}
