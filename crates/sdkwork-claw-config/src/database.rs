use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DatabaseEngine {
    Sqlite,
    Postgres,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub engine: DatabaseEngine,
    pub url: String,
    pub max_connections: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RuntimeConfigProfile {
    Server,
    Desktop,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeConfigLocation {
    pub config_file: PathBuf,
    pub data_directory: PathBuf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RuntimeConfigInitializationAction {
    Existing,
    Created,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeConfigInitializationReport {
    pub profile: RuntimeConfigProfile,
    pub location: RuntimeConfigLocation,
    pub action: RuntimeConfigInitializationAction,
    pub database: DatabaseConfig,
}

#[derive(Debug, Deserialize)]
struct RuntimeConfigFile {
    database: RuntimeDatabaseConfig,
}

#[derive(Debug, Deserialize)]
struct RuntimeDatabaseConfig {
    engine: Option<String>,
    url: Option<String>,
    host: Option<String>,
    port: Option<u16>,
    database: Option<String>,
    username: Option<String>,
    password: Option<String>,
    password_file: Option<String>,
    ssl_mode: Option<String>,
    max_connections: Option<u32>,
}

impl DatabaseConfig {
    pub const DEFAULT_MAX_CONNECTIONS: u32 = 16;
    pub const DESKTOP_SQLITE_DEFAULT_MAX_CONNECTIONS: u32 = 8;
    pub const ENV_CONFIG_FILE: &'static str = "SDKWORK_CLAW_CONFIG_FILE";
    pub const SERVER_DEFAULT_POSTGRES_URL: &'static str =
        "postgresql://sdkwork_ai_prod:change-me@db.example.com:5432/sdkwork_ai_prod?sslmode=require";
    pub const SERVER_DEFAULT_POSTGRES_HOST: &'static str = "db.example.com";
    pub const SERVER_DEFAULT_POSTGRES_PORT: u16 = 5432;
    pub const SERVER_DEFAULT_POSTGRES_DATABASE: &'static str = "sdkwork_ai_prod";
    pub const SERVER_DEFAULT_POSTGRES_USERNAME: &'static str = "sdkwork_ai_prod";
    pub const SERVER_DEFAULT_POSTGRES_PASSWORD: &'static str = "change-me";
    pub const SERVER_DEFAULT_POSTGRES_PASSWORD_FILE: &'static str =
        "/etc/sdkwork/router/database.secret";
    pub const SERVER_DEFAULT_POSTGRES_SSL_MODE: &'static str = "require";

    pub fn from_url(url: impl Into<String>) -> Result<Self, String> {
        Self::from_url_with_max_connections(url, Self::DEFAULT_MAX_CONNECTIONS)
    }

    pub fn from_url_with_max_connections(
        url: impl Into<String>,
        max_connections: u32,
    ) -> Result<Self, String> {
        if max_connections == 0 {
            return Err("database max connections must be greater than zero".to_owned());
        }

        let url = url.into();
        let engine = DatabaseEngine::from_url(&url)?;
        Ok(Self {
            engine,
            url,
            max_connections,
        })
    }

    pub fn from_optional_parts(
        database_url: Option<String>,
        max_connections: Option<String>,
    ) -> Result<Option<Self>, String> {
        let Some(database_url) = database_url else {
            return Ok(None);
        };

        let max_connections = match max_connections {
            Some(value) => value.parse::<u32>().map_err(|_| {
                format!("SDKWORK_DATABASE_MAX_CONNECTIONS must be a positive integer: {value}")
            })?,
            None => Self::DEFAULT_MAX_CONNECTIONS,
        };

        Self::from_url_with_max_connections(database_url, max_connections).map(Some)
    }

    pub fn from_env() -> Result<Option<Self>, String> {
        let env_config = Self::from_canonical_database_env()?;
        if env_config.is_some() {
            return Ok(env_config);
        }

        if let Some(config_file) = explicit_runtime_config_file() {
            return Self::from_config_file(config_file);
        }

        let location =
            RuntimeConfigLocation::for_current_platform(runtime_config_profile_from_env());
        if location.config_file.exists() {
            return Self::from_config_file(location.config_file);
        }

        Ok(None)
    }

    pub fn from_env_or_initialize() -> Result<Option<Self>, String> {
        let profile = RuntimeConfigProfile::from_env_or_runtime_toml(None)?;
        let location = Self::runtime_config_location_from_env(profile);
        let env_config = Self::from_canonical_database_env()?;
        if let Some(config) = env_config {
            config.validate_for_runtime_profile_at(profile, &location)?;
            return Ok(Some(config));
        }

        let report = Self::initialize_default_runtime_config_at(profile, &location)?;
        report
            .database
            .validate_for_runtime_profile_at(profile, &report.location)?;
        Ok(Some(report.database))
    }

    pub fn from_env_or_runtime_toml_or_initialize(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        let profile = RuntimeConfigProfile::from_env_or_runtime_toml(runtime_toml)?;
        let location = Self::runtime_config_location_from_env(profile);
        let env_config = Self::from_canonical_database_env()?;
        if let Some(config) = env_config {
            config.validate_for_runtime_profile_at(profile, &location)?;
            return Ok(Some(config));
        }

        let report = Self::initialize_default_runtime_config_at(profile, &location)?;
        report
            .database
            .validate_for_runtime_profile_at(profile, &report.location)?;
        Ok(Some(report.database))
    }

    fn from_canonical_database_env() -> Result<Option<Self>, String> {
        use sdkwork_database_config::workspace_database::{
            reject_retired_database_env, workspace_database_env_is_configured,
        };

        reject_retired_database_env().map_err(|error| error.to_string())?;
        if !workspace_database_env_is_configured() {
            return Ok(None);
        }

        let standard = sdkwork_database_config::env::load_from_env("CLAWROUTER")
            .map_err(|error| error.to_string())?;
        Self::from_url_with_max_connections(standard.url, standard.max_connections).map(Some)
    }

    pub fn runtime_config_location_from_env(
        profile: RuntimeConfigProfile,
    ) -> RuntimeConfigLocation {
        let default_location = RuntimeConfigLocation::for_current_platform(profile);
        if let Some(config_file) = explicit_runtime_config_file() {
            let data_directory = config_file
                .parent()
                .filter(|path| !path.as_os_str().is_empty())
                .map(|path| path.join("Data"))
                .unwrap_or_else(|| default_location.data_directory.clone());
            RuntimeConfigLocation {
                config_file,
                data_directory,
            }
        } else {
            default_location
        }
    }

    pub fn initialize_default_runtime_config(
        profile: RuntimeConfigProfile,
    ) -> Result<RuntimeConfigInitializationReport, String> {
        let location = Self::runtime_config_location_from_env(profile);
        Self::initialize_default_runtime_config_at(profile, &location)
    }

    pub fn initialize_default_runtime_config_at(
        profile: RuntimeConfigProfile,
        location: &RuntimeConfigLocation,
    ) -> Result<RuntimeConfigInitializationReport, String> {
        if location.config_file.exists() {
            let database = Self::from_config_file(&location.config_file)?.ok_or_else(|| {
                format!(
                    "runtime TOML {} did not contain a database configuration",
                    location.config_file.display()
                )
            })?;
            return Ok(RuntimeConfigInitializationReport {
                profile,
                location: location.clone(),
                action: RuntimeConfigInitializationAction::Existing,
                database,
            });
        }

        if let Some(parent) = location
            .config_file
            .parent()
            .filter(|path| !path.as_os_str().is_empty())
        {
            std::fs::create_dir_all(parent).map_err(|error| {
                format!(
                    "failed to create runtime config directory {}: {error}\n{}",
                    parent.display(),
                    Self::startup_help_text(profile)
                )
            })?;
        }
        std::fs::create_dir_all(&location.data_directory).map_err(|error| {
            format!(
                "failed to create runtime data directory {}: {error}\n{}",
                location.data_directory.display(),
                Self::startup_help_text(profile)
            )
        })?;

        let database = Self::default_runtime_database_config(profile, location)?;
        let content = Self::default_runtime_config_toml(profile, location)?;
        std::fs::write(&location.config_file, content).map_err(|error| {
            format!(
                "failed to write runtime TOML {}: {error}\n{}",
                location.config_file.display(),
                Self::startup_help_text(profile)
            )
        })?;

        Ok(RuntimeConfigInitializationReport {
            profile,
            location: location.clone(),
            action: RuntimeConfigInitializationAction::Created,
            database,
        })
    }

    pub fn default_runtime_config_toml(
        profile: RuntimeConfigProfile,
        location: &RuntimeConfigLocation,
    ) -> Result<String, String> {
        let database = Self::default_runtime_database_config(profile, location)?;
        let engine = match database.engine {
            DatabaseEngine::Sqlite => "sqlite",
            DatabaseEngine::Postgres => "postgresql",
        };
        let deployment_mode = match profile {
            RuntimeConfigProfile::Server => "server",
            RuntimeConfigProfile::Desktop => "desktop",
        };
        let mut lines = vec![
            "# SdkWork ClawRouter runtime configuration.".to_owned(),
            "# This file was initialized automatically; edit [database] for the target environment.".to_owned(),
            format!(
                "# Runtime config file: {}",
                location.config_file.display()
            ),
            String::new(),
        ];
        if profile == RuntimeConfigProfile::Server {
            lines.push(
                "# Server/service deployments use external PostgreSQL by default.".to_owned(),
            );
            lines.push(
                "# Configure host, database, username, and password_file. You may use password directly only when this TOML is protected as a secret-bearing file."
                    .to_owned(),
            );
            lines.push(String::new());
        } else {
            lines.push("# Desktop deployments default to a local SQLite database.".to_owned());
            lines.push(format!(
                "# Default SQLite file: {}",
                location.sqlite_database_path().display()
            ));
            lines.push(String::new());
        }
        lines.extend(["[database]".to_owned(), format!("engine = \"{engine}\"")]);
        if database.engine == DatabaseEngine::Postgres {
            let password_file = server_default_postgres_password_file(location);
            lines.extend([
                format!("host = \"{}\"", Self::SERVER_DEFAULT_POSTGRES_HOST),
                format!("port = {}", Self::SERVER_DEFAULT_POSTGRES_PORT),
                format!("database = \"{}\"", Self::SERVER_DEFAULT_POSTGRES_DATABASE),
                format!("username = \"{}\"", Self::SERVER_DEFAULT_POSTGRES_USERNAME),
                format!("password_file = \"{}\"", toml_string(&password_file)),
                format!(
                    "# password = \"{}\"",
                    Self::SERVER_DEFAULT_POSTGRES_PASSWORD
                ),
                format!("ssl_mode = \"{}\"", Self::SERVER_DEFAULT_POSTGRES_SSL_MODE),
                format!("max_connections = {}", database.max_connections),
            ]);
        } else {
            lines.extend([
                format!("url = \"{}\"", toml_string(&database.url)),
                format!("max_connections = {}", database.max_connections),
            ]);
        }
        lines.extend([
            String::new(),
            "[paths]".to_owned(),
            format!(
                "data_directory = \"{}\"",
                toml_string(&portable_path(&location.data_directory))
            ),
            String::new(),
            "[runtime]".to_owned(),
            format!("deployment_mode = \"{deployment_mode}\""),
            String::new(),
        ]);
        Ok(lines.join("\n"))
    }

    pub fn default_runtime_database_config(
        profile: RuntimeConfigProfile,
        location: &RuntimeConfigLocation,
    ) -> Result<Self, String> {
        match profile {
            RuntimeConfigProfile::Server => Self::from_url_with_max_connections(
                Self::SERVER_DEFAULT_POSTGRES_URL,
                Self::DEFAULT_MAX_CONNECTIONS,
            ),
            RuntimeConfigProfile::Desktop => Self::from_url_with_max_connections(
                format!(
                    "sqlite://{}",
                    portable_path(&location.sqlite_database_path())
                ),
                Self::DESKTOP_SQLITE_DEFAULT_MAX_CONNECTIONS,
            ),
        }
    }

    pub fn validate_for_runtime_profile_at(
        &self,
        profile: RuntimeConfigProfile,
        location: &RuntimeConfigLocation,
    ) -> Result<(), String> {
        if profile != RuntimeConfigProfile::Server {
            return Ok(());
        }
        if self.engine == DatabaseEngine::Postgres && is_placeholder_postgres_url(&self.url) {
            return Err(runtime_profile_error(
                "PostgreSQL configuration is incomplete; the runtime TOML still contains a default placeholder host or password.",
                profile,
                location,
            ));
        }
        Ok(())
    }

    pub fn from_config_file(path: impl AsRef<Path>) -> Result<Option<Self>, String> {
        let path = path.as_ref();
        let content = std::fs::read_to_string(path)
            .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
        Self::from_runtime_config_toml_at(&content, path).map(Some)
    }

    pub fn from_runtime_config_toml(content: &str) -> Result<Self, String> {
        Self::from_runtime_config_toml_inner(content, None)
    }

    fn from_runtime_config_toml_at(content: &str, path: &Path) -> Result<Self, String> {
        Self::from_runtime_config_toml_inner(content, Some(path))
    }

    fn from_runtime_config_toml_inner(
        content: &str,
        config_path: Option<&Path>,
    ) -> Result<Self, String> {
        let runtime_config: RuntimeConfigFile = toml::from_str(content)
            .map_err(|error| format!("invalid runtime config TOML: {error}"))?;
        let database = runtime_config.database;
        let max_connections = database
            .max_connections
            .unwrap_or(Self::DEFAULT_MAX_CONNECTIONS);
        let declared_engine = database
            .engine
            .as_deref()
            .map(normalize_database_engine_name)
            .transpose()?;
        let url = runtime_database_url(database, declared_engine.as_deref(), config_path)?;

        let config = Self::from_url_with_max_connections(url, max_connections)?;
        if let Some(engine) = declared_engine {
            let expected = match config.engine {
                DatabaseEngine::Sqlite => "sqlite",
                DatabaseEngine::Postgres => "postgresql",
            };
            if engine != expected {
                return Err(format!(
                    "runtime config [database].engine {engine} does not match database url scheme {expected}"
                ));
            }
        }
        Ok(config)
    }

    pub fn startup_help_lines(profile: RuntimeConfigProfile) -> Vec<String> {
        let location = RuntimeConfigLocation::for_current_platform(profile);
        Self::startup_help_lines_for_location(profile, &location)
    }

    pub fn startup_help_lines_for_location(
        profile: RuntimeConfigProfile,
        location: &RuntimeConfigLocation,
    ) -> Vec<String> {
        match profile {
            RuntimeConfigProfile::Server => vec![
                format!("Runtime config file: {}", location.config_file.display()),
                format!("Data directory: {}", location.data_directory.display()),
                "Set SDKWORK_CLAW_CONFIG_FILE to override the runtime TOML location.".to_owned(),
                "Server/service deployments use external PostgreSQL by default.".to_owned(),
                format!(
                    "Configure PostgreSQL host, database, username, and password/password_file in {}",
                    location.config_file.display()
                ),
                "SDKWORK_DATABASE_URL remains available as an explicit operator override.".to_owned(),
            ],
            RuntimeConfigProfile::Desktop => vec![
                format!("Runtime config file: {}", location.config_file.display()),
                format!("Data directory: {}", location.data_directory.display()),
                "Set SDKWORK_CLAW_CONFIG_FILE to override the runtime TOML location.".to_owned(),
                "Desktop deployments default to SQLite.".to_owned(),
                format!(
                    "Default SQLite file: {}",
                    location.sqlite_database_path().display()
                ),
            ],
        }
    }

    pub fn startup_help_text(profile: RuntimeConfigProfile) -> String {
        Self::startup_help_lines(profile).join("\n")
    }
}

impl DatabaseEngine {
    fn from_url(url: &str) -> Result<Self, String> {
        let normalized = url.trim().to_ascii_lowercase();
        if normalized.is_empty() {
            return Err("database url must not be empty".to_owned());
        }
        if normalized.starts_with("sqlite:") {
            return Ok(Self::Sqlite);
        }
        if normalized.starts_with("postgres://") || normalized.starts_with("postgresql://") {
            return Ok(Self::Postgres);
        }
        Err(format!("unsupported database url scheme: {url}"))
    }
}

fn server_default_postgres_password_file(location: &RuntimeConfigLocation) -> String {
    let config_file = portable_path(&location.config_file);
    if config_file == "/etc/sdkwork/router/clawrouter.toml" {
        return DatabaseConfig::SERVER_DEFAULT_POSTGRES_PASSWORD_FILE.to_owned();
    }
    if let Some(parent) = location
        .config_file
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        return portable_path(&PathBuf::from(join_runtime_path(
            parent.to_string_lossy().as_ref(),
            "database.secret",
        )));
    }
    portable_path(&PathBuf::from(join_runtime_path(
        location.data_directory.to_string_lossy().as_ref(),
        "database.secret",
    )))
}

fn normalize_database_engine_name(value: &str) -> Result<String, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "sqlite" => Ok("sqlite".to_owned()),
        "postgres" | "postgresql" => Ok("postgresql".to_owned()),
        other => Err(format!(
            "unsupported runtime config [database].engine: {other}"
        )),
    }
}

fn runtime_database_url(
    database: RuntimeDatabaseConfig,
    declared_engine: Option<&str>,
    config_path: Option<&Path>,
) -> Result<String, String> {
    if let Some(url) = database.url.as_ref() {
        let url = required_value("runtime config [database].url", Some(url.to_owned()))?;
        if has_structured_postgres_fields(&database) {
            return Err(
                "runtime config [database] must use either url or structured PostgreSQL fields, not both"
                    .to_owned(),
            );
        }
        return Ok(url);
    }

    match declared_engine {
        Some("postgresql") => structured_postgres_url(database, config_path),
        Some("sqlite") => Err(
            "runtime config [database].url is required when [database].engine is sqlite"
                .to_owned(),
        ),
        Some(other) => Err(format!(
            "runtime config [database].engine {other} is not supported"
        )),
        None => Err(
            "runtime config [database] must declare either url or structured PostgreSQL fields with engine = \"postgresql\""
                .to_owned(),
        ),
    }
}

fn has_structured_postgres_fields(database: &RuntimeDatabaseConfig) -> bool {
    database.host.is_some()
        || database.port.is_some()
        || database.database.is_some()
        || database.username.is_some()
        || database.password.is_some()
        || database.password_file.is_some()
        || database.ssl_mode.is_some()
}

fn structured_postgres_url(
    database: RuntimeDatabaseConfig,
    config_path: Option<&Path>,
) -> Result<String, String> {
    let host = required_value("runtime config [database].host", database.host)?;
    let port = database.port.unwrap_or(5432);
    let database_name = required_value("runtime config [database].database", database.database)?;
    let username = required_value("runtime config [database].username", database.username)?;
    let password =
        structured_postgres_password(database.password, database.password_file, config_path)?;
    let ssl_mode = database
        .ssl_mode
        .map(normalize_postgres_ssl_mode)
        .transpose()?;

    let mut url = url::Url::parse("postgresql://localhost")
        .map_err(|error| format!("failed to initialize PostgreSQL URL: {error}"))?;
    url.set_host(Some(host.as_str()))
        .map_err(|_| format!("runtime config [database].host is not valid: {host}"))?;
    url.set_port(Some(port))
        .map_err(|_| format!("runtime config [database].port is not valid: {port}"))?;
    url.set_path(database_name.as_str());
    url.set_username(username.as_str()).map_err(|_| {
        "runtime config [database].username cannot be represented in a PostgreSQL URL".to_owned()
    })?;
    url.set_password(Some(password.as_str())).map_err(|_| {
        "runtime config [database].password cannot be represented in a PostgreSQL URL".to_owned()
    })?;
    if let Some(ssl_mode) = ssl_mode {
        url.query_pairs_mut()
            .append_pair("sslmode", ssl_mode.as_str());
    }
    Ok(url.to_string())
}

fn structured_postgres_password(
    password: Option<String>,
    password_file: Option<String>,
    config_path: Option<&Path>,
) -> Result<String, String> {
    match (password, password_file) {
        (Some(_), Some(_)) => Err(
            "runtime config [database] must use only one of password or password_file".to_owned(),
        ),
        (Some(password), None) => {
            required_value("runtime config [database].password", Some(password))
        }
        (None, Some(password_file)) => {
            let password_file = required_value(
                "runtime config [database].password_file",
                Some(password_file),
            )?;
            let path = resolve_password_file_path(&password_file, config_path);
            let password = std::fs::read_to_string(&path).map_err(|error| {
                format!(
                    "failed to read runtime config [database].password_file {}: {error}",
                    path.display()
                )
            })?;
            required_value(
                &format!("runtime config [database].password_file {}", path.display()),
                Some(password),
            )
        }
        (None, None) => Err(
            "runtime config [database] must provide password or password_file for PostgreSQL"
                .to_owned(),
        ),
    }
}

fn resolve_password_file_path(value: &str, config_path: Option<&Path>) -> PathBuf {
    let expanded = expand_runtime_path_variables(value);
    let path = PathBuf::from(expanded);
    if path.is_absolute() {
        return path;
    }
    config_path
        .and_then(Path::parent)
        .filter(|parent| !parent.as_os_str().is_empty())
        .map(|parent| parent.join(path.as_path()))
        .unwrap_or(path)
}

fn expand_runtime_path_variables(value: &str) -> String {
    let expanded = expand_braced_env_variables(value);
    let expanded = expand_percent_env_variables(&expanded);
    let expanded = expand_dollar_env_variables(&expanded);
    expand_home_directory(&expanded)
}

fn expand_braced_env_variables(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut cursor = 0;
    while let Some(start) = value[cursor..].find("${") {
        let absolute_start = cursor + start;
        output.push_str(&value[cursor..absolute_start]);
        let name_start = absolute_start + 2;
        let Some(end_offset) = value[name_start..].find('}') else {
            output.push_str(&value[absolute_start..]);
            return output;
        };
        let name_end = name_start + end_offset;
        let name = &value[name_start..name_end];
        if !name.is_empty() {
            if let Ok(replacement) = std::env::var(name) {
                output.push_str(&replacement);
            } else {
                output.push_str(&value[absolute_start..=name_end]);
            }
        } else {
            output.push_str(&value[absolute_start..=name_end]);
        }
        cursor = name_end + 1;
    }
    output.push_str(&value[cursor..]);
    output
}

fn expand_percent_env_variables(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut cursor = 0;
    while let Some(start) = value[cursor..].find('%') {
        let absolute_start = cursor + start;
        output.push_str(&value[cursor..absolute_start]);
        let name_start = absolute_start + 1;
        let Some(end_offset) = value[name_start..].find('%') else {
            output.push_str(&value[absolute_start..]);
            return output;
        };
        let name_end = name_start + end_offset;
        let name = &value[name_start..name_end];
        if !name.is_empty() {
            if let Ok(replacement) = std::env::var(name) {
                output.push_str(&replacement);
            } else {
                output.push_str(&value[absolute_start..=name_end]);
            }
        } else {
            output.push_str(&value[absolute_start..=name_end]);
        }
        cursor = name_end + 1;
    }
    output.push_str(&value[cursor..]);
    output
}

fn expand_dollar_env_variables(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut chars = value.char_indices().peekable();
    while let Some((index, character)) = chars.next() {
        if character != '$' {
            output.push(character);
            continue;
        }
        if matches!(chars.peek(), Some((_, '{'))) {
            output.push('$');
            continue;
        }
        let name_start = index + 1;
        let mut name_end = name_start;
        while let Some((next_index, next_character)) = chars.peek().copied() {
            if next_character == '_' || next_character.is_ascii_alphanumeric() {
                name_end = next_index + next_character.len_utf8();
                chars.next();
            } else {
                break;
            }
        }
        if name_end == name_start {
            output.push('$');
            continue;
        }
        let name = &value[name_start..name_end];
        if let Ok(replacement) = std::env::var(name) {
            output.push_str(&replacement);
        } else {
            output.push('$');
            output.push_str(name);
        }
    }
    output
}

fn expand_home_directory(value: &str) -> String {
    if value == "~" {
        return std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| value.to_owned());
    }
    let Some(rest) = value
        .strip_prefix("~/")
        .or_else(|| value.strip_prefix("~\\"))
    else {
        return value.to_owned();
    };
    let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) else {
        return value.to_owned();
    };
    let mut path = PathBuf::from(home);
    path.push(rest);
    path.to_string_lossy().to_string()
}

fn normalize_postgres_ssl_mode(value: String) -> Result<String, String> {
    let value = value.trim().to_ascii_lowercase();
    match value.as_str() {
        "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full" => Ok(value),
        "" => Err("runtime config [database].ssl_mode must not be blank".to_owned()),
        other => Err(format!(
            "runtime config [database].ssl_mode is unsupported: {other}"
        )),
    }
}

fn required_value(label: &str, value: Option<String>) -> Result<String, String> {
    let Some(value) = value else {
        return Err(format!("{label} is required"));
    };
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{label} must not be blank"));
    }
    Ok(value.to_owned())
}

/// Workspace-standard development passwords from ENVIRONMENT_SPEC §7.1.
const WORKSPACE_DEVELOPMENT_POSTGRES_PASSWORDS: &[&str] = &["sdkworkdev123", "postgres_admin_pass"];

/// Known example/dev passwords that must never reach a production database URL.
const KNOWN_PLACEHOLDER_POSTGRES_PASSWORDS: &[&str] = &[
    "change-me",
    "<CHANGE_ME>",
    "<CHANGE-ME>",
    "sdkworkdev123",
    "postgres_admin_pass",
    "sdkwork_claw_test_password",
];

fn is_workspace_development_postgres_url(parsed: &url::Url) -> bool {
    let host = parsed.host_str().unwrap_or_default().to_ascii_lowercase();
    if !matches!(host.as_str(), "localhost" | "127.0.0.1" | "::1") {
        return false;
    }
    let database = parsed
        .path()
        .trim_start_matches('/')
        .split('?')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    matches!(database.as_str(), "sdkwork_ai_dev" | "postgres")
}

fn is_workspace_development_postgres_password(password: &str) -> bool {
    let normalized = password.trim().to_ascii_lowercase();
    if WORKSPACE_DEVELOPMENT_POSTGRES_PASSWORDS
        .iter()
        .any(|known| normalized == known.to_ascii_lowercase())
    {
        return true;
    }
    let decoded = percent_decode_str(password);
    if decoded != normalized {
        let decoded_lower = decoded.trim().to_ascii_lowercase();
        return WORKSPACE_DEVELOPMENT_POSTGRES_PASSWORDS
            .iter()
            .any(|known| decoded_lower == known.to_ascii_lowercase());
    }
    false
}

fn is_placeholder_postgres_url(value: &str) -> bool {
    const LEGACY_SERVER_DEFAULT_POSTGRES_URL: &str =
        "postgresql://sdkwork_claw_router:change-me@localhost:5432/sdkwork_claw_router";
    const LEGACY_SERVER_DEFAULT_POSTGRES_URL_V2: &str =
        "postgresql://sdkwork_claw_router:change-me@db.example.com:5432/sdkwork_claw_router?sslmode=require";
    const LEGACY_SERVER_DEFAULT_POSTGRES_URL_V3: &str =
        "postgresql://sdkworkprod%402026%2B%2B:change-me@db.example.com:5432/sdkwork_ai_prod?sslmode=require";
    const LEGACY_SERVER_DEFAULT_POSTGRES_URL_V4: &str =
        "postgresql://sdkwork:change-me@db.example.com:5432/sdkwork?sslmode=require";

    let value = value.trim();
    if value == DatabaseConfig::SERVER_DEFAULT_POSTGRES_URL
        || value == LEGACY_SERVER_DEFAULT_POSTGRES_URL
        || value == LEGACY_SERVER_DEFAULT_POSTGRES_URL_V2
        || value == LEGACY_SERVER_DEFAULT_POSTGRES_URL_V3
        || value == LEGACY_SERVER_DEFAULT_POSTGRES_URL_V4
    {
        return true;
    }

    // Catch raw placeholder tokens that may break URL parsing (e.g. <CHANGE_ME>).
    let value_lower = value.to_ascii_lowercase();
    if value_lower.contains("<change_me>") || value_lower.contains("<change-me>") {
        return true;
    }

    let Ok(parsed) = url::Url::parse(value) else {
        return false;
    };
    if parsed.username() == "sdkworkprod@2026++" {
        return true;
    }
    let host = parsed.host_str().unwrap_or_default().to_ascii_lowercase();
    if host == DatabaseConfig::SERVER_DEFAULT_POSTGRES_HOST {
        return true;
    }
    if is_workspace_development_postgres_url(&parsed)
        && parsed
            .password()
            .is_some_and(is_workspace_development_postgres_password)
    {
        return false;
    }
    parsed.password().is_some_and(is_known_placeholder_password)
}

fn is_known_placeholder_password(password: &str) -> bool {
    let normalized = password.trim().to_ascii_lowercase();
    if KNOWN_PLACEHOLDER_POSTGRES_PASSWORDS
        .iter()
        .any(|known| normalized == known.to_ascii_lowercase())
    {
        return true;
    }
    // Url::password() returns the percent-encoded form; decode before comparing.
    let decoded = percent_decode_str(password);
    if decoded != normalized {
        let decoded_lower = decoded.trim().to_ascii_lowercase();
        if KNOWN_PLACEHOLDER_POSTGRES_PASSWORDS
            .iter()
            .any(|known| decoded_lower == known.to_ascii_lowercase())
        {
            return true;
        }
    }
    false
}

fn percent_decode_str(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut result = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let (Some(high), Some(low)) =
                (hex_digit(bytes[index + 1]), hex_digit(bytes[index + 2]))
            {
                result.push(high * 16 + low);
                index += 3;
                continue;
            }
        }
        result.push(bytes[index]);
        index += 1;
    }
    String::from_utf8_lossy(&result).into_owned()
}

fn hex_digit(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

impl RuntimeConfigLocation {
    pub fn for_current_platform(profile: RuntimeConfigProfile) -> Self {
        let platform = if cfg!(windows) {
            "windows"
        } else if cfg!(target_os = "macos") {
            "macos"
        } else {
            "linux"
        };
        Self::for_platform_resolved(platform, profile, |key| std::env::var(key).ok())
    }

    pub fn for_platform(platform: &str, profile: RuntimeConfigProfile) -> Self {
        match (normalize_platform(platform).as_str(), profile) {
            ("windows", RuntimeConfigProfile::Server) => Self {
                config_file: PathBuf::from("%ProgramData%/sdkwork/router/clawrouter.toml"),
                data_directory: PathBuf::from("%ProgramData%/sdkwork/router/Data"),
            },
            ("windows", RuntimeConfigProfile::Desktop) => Self {
                config_file: PathBuf::from("%USERPROFILE%/.sdkwork/router/config/clawrouter.toml"),
                data_directory: PathBuf::from("%USERPROFILE%/.sdkwork/router/data"),
            },
            ("macos", RuntimeConfigProfile::Server) => Self {
                config_file: PathBuf::from(
                    "/Library/Application Support/sdkwork/router/clawrouter.toml",
                ),
                data_directory: PathBuf::from("/Library/Application Support/sdkwork/router/Data"),
            },
            ("macos", RuntimeConfigProfile::Desktop) => Self {
                config_file: PathBuf::from("~/.sdkwork/router/config/clawrouter.toml"),
                data_directory: PathBuf::from("~/.sdkwork/router/data"),
            },
            (_, RuntimeConfigProfile::Server) => Self {
                config_file: PathBuf::from("/etc/sdkwork/router/clawrouter.toml"),
                data_directory: PathBuf::from("/var/lib/sdkwork/router"),
            },
            (_, RuntimeConfigProfile::Desktop) => Self {
                config_file: PathBuf::from("~/.sdkwork/router/config/clawrouter.toml"),
                data_directory: PathBuf::from("~/.sdkwork/router/data"),
            },
        }
    }

    pub fn for_platform_resolved<F>(platform: &str, profile: RuntimeConfigProfile, env: F) -> Self
    where
        F: Fn(&str) -> Option<String>,
    {
        let get_env = |key: &str| env(key).filter(|value| !value.trim().is_empty());
        match (normalize_platform(platform).as_str(), profile) {
            ("windows", RuntimeConfigProfile::Server) => {
                let program_data = get_env("ProgramData")
                    .or_else(|| get_env("PROGRAMDATA"))
                    .unwrap_or_else(|| "C:/ProgramData".to_owned());
                let root = join_runtime_path(&program_data, "sdkwork/router");
                Self {
                    config_file: PathBuf::from(join_runtime_path(&root, "clawrouter.toml")),
                    data_directory: PathBuf::from(join_runtime_path(&root, "Data")),
                }
            }
            ("windows", RuntimeConfigProfile::Desktop) => {
                let home = get_env("USERPROFILE")
                    .or_else(|| match (get_env("HOMEDRIVE"), get_env("HOMEPATH")) {
                        (Some(drive), Some(path)) => Some(format!("{drive}{path}")),
                        _ => None,
                    })
                    .unwrap_or_else(|| "C:/Users/Default".to_owned());
                let root = join_runtime_path(&home, ".sdkwork/router");
                Self {
                    config_file: PathBuf::from(join_runtime_path(&root, "config/clawrouter.toml")),
                    data_directory: PathBuf::from(join_runtime_path(&root, "data")),
                }
            }
            ("macos", RuntimeConfigProfile::Server) => Self::for_platform(platform, profile),
            ("macos", RuntimeConfigProfile::Desktop) => {
                let home = get_env("HOME").unwrap_or_else(|| "~".to_owned());
                let root = join_runtime_path(&home, ".sdkwork/router");
                Self {
                    config_file: PathBuf::from(join_runtime_path(&root, "config/clawrouter.toml")),
                    data_directory: PathBuf::from(join_runtime_path(&root, "data")),
                }
            }
            (_, RuntimeConfigProfile::Server) => Self::for_platform(platform, profile),
            (_, RuntimeConfigProfile::Desktop) => {
                let home = get_env("HOME").unwrap_or_else(|| "~".to_owned());
                let root = join_runtime_path(&home, ".sdkwork/router");
                Self {
                    config_file: PathBuf::from(join_runtime_path(&root, "config/clawrouter.toml")),
                    data_directory: PathBuf::from(join_runtime_path(&root, "data")),
                }
            }
        }
    }

    pub fn sqlite_database_path(&self) -> PathBuf {
        PathBuf::from(join_runtime_path(
            self.data_directory.to_string_lossy().as_ref(),
            "clawrouter.sqlite",
        ))
    }
}

impl RuntimeConfigProfile {
    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Self, String> {
        let deployment_runtime = crate::deployment::resolve_deployment_runtime(runtime_toml)?;
        Ok(Self::from_deployment_mode(deployment_runtime.mode))
    }

    pub fn from_deployment_mode(deployment_mode: crate::DeploymentMode) -> Self {
        match deployment_mode {
            crate::DeploymentMode::Desktop => Self::Desktop,
            crate::DeploymentMode::Server
            | crate::DeploymentMode::Docker
            | crate::DeploymentMode::Kubernetes => Self::Server,
        }
    }
}

fn explicit_runtime_config_file() -> Option<PathBuf> {
    std::env::var(DatabaseConfig::ENV_CONFIG_FILE)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

fn runtime_config_profile_from_env() -> RuntimeConfigProfile {
    RuntimeConfigProfile::from_env_or_runtime_toml(None).unwrap_or(RuntimeConfigProfile::Server)
}

fn normalize_platform(platform: &str) -> String {
    match platform.trim().to_ascii_lowercase().as_str() {
        "win32" | "windows" => "windows".to_owned(),
        "darwin" | "mac" | "macos" => "macos".to_owned(),
        _ => "linux".to_owned(),
    }
}

fn join_runtime_path(base: &str, child: &str) -> String {
    let base = base.trim().trim_end_matches(['/', '\\']);
    let child = child.trim().trim_start_matches(['/', '\\']);
    if base.is_empty() {
        return child.to_owned();
    }
    if child.is_empty() {
        return base.to_owned();
    }
    format!("{base}/{child}")
}

fn portable_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn toml_string(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
}

fn runtime_profile_error(
    message: &str,
    profile: RuntimeConfigProfile,
    location: &RuntimeConfigLocation,
) -> String {
    format!(
        "{message}\nRuntime TOML: {}\n{}",
        location.config_file.display(),
        DatabaseConfig::startup_help_lines_for_location(profile, location).join("\n")
    )
}
