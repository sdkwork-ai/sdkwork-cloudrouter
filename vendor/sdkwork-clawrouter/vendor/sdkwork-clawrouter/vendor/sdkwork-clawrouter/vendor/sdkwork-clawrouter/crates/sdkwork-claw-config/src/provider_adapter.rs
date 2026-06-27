use std::fmt;

use sdkwork_claw_provider_adapter_contract::ProviderAdapterManifest;
use sdkwork_claw_provider_adapter_registry::{ProviderAdapterRouteConfig, ProviderAdapterSnapshot};
use serde::Deserialize;

#[derive(Clone, PartialEq, Eq)]
pub struct ProviderAdapterConfig {
    routes: Vec<ProviderAdapterRouteConfig>,
    gateway_token: String,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ProviderAdapterManifestDiscoveryConfig {
    adapter_base_url: String,
    gateway_token: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderAdapterJsonConfig {
    #[serde(default)]
    routes: Vec<ProviderAdapterRouteConfig>,
    #[serde(default)]
    adapter_base_url: Option<String>,
    #[serde(default)]
    manifest: Option<ProviderAdapterManifest>,
}

impl ProviderAdapterConfig {
    pub const ENV_PROVIDER_ADAPTER_JSON: &'static str = "SDKWORK_CLAW_PROVIDER_ADAPTER_JSON";
    pub const ENV_PROVIDER_ADAPTER_JSON_FILE: &'static str =
        "SDKWORK_CLAW_PROVIDER_ADAPTER_JSON_FILE";
    pub const ENV_PROVIDER_ADAPTER_BASE_URL: &'static str =
        "SDKWORK_CLAW_PROVIDER_ADAPTER_BASE_URL";
    pub const ENV_PROVIDER_ADAPTER_MANIFEST: &'static str =
        "SDKWORK_CLAW_PROVIDER_ADAPTER_MANIFEST";
    pub const ENV_PROVIDER_ADAPTER_MANIFEST_FILE: &'static str =
        "SDKWORK_CLAW_PROVIDER_ADAPTER_MANIFEST_FILE";
    pub const ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN: &'static str =
        "SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN";
    pub const ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE: &'static str =
        "SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE";

    pub fn from_json(
        adapter_json: impl AsRef<str>,
        gateway_token: Option<String>,
    ) -> Result<Self, String> {
        let adapter_json = adapter_json.as_ref().trim();
        if adapter_json.is_empty() {
            return Err(format!(
                "{} must not be blank",
                Self::ENV_PROVIDER_ADAPTER_JSON
            ));
        }
        let parsed: ProviderAdapterJsonConfig =
            serde_json::from_str(adapter_json).map_err(|error| {
                format!(
                    "{} must be a JSON object with routes or manifest config: {error}",
                    Self::ENV_PROVIDER_ADAPTER_JSON
                )
            })?;
        Self::from_json_config(parsed, gateway_token)
    }

    pub fn from_manifest_json(
        adapter_base_url: impl AsRef<str>,
        manifest_json: impl AsRef<str>,
        gateway_token: Option<String>,
    ) -> Result<Self, String> {
        let manifest_json = manifest_json.as_ref().trim();
        if manifest_json.is_empty() {
            return Err(format!(
                "{} must not be blank",
                Self::ENV_PROVIDER_ADAPTER_MANIFEST
            ));
        }
        let manifest: ProviderAdapterManifest =
            serde_json::from_str(manifest_json).map_err(|error| {
                format!(
                    "{} must be a provider adapter manifest JSON object: {error}",
                    Self::ENV_PROVIDER_ADAPTER_MANIFEST
                )
            })?;
        let routes = Self::routes_from_manifest(&manifest, Some(adapter_base_url.as_ref()))?;
        Self::from_routes(routes, gateway_token)
    }

    pub fn from_manifest(
        adapter_base_url: impl AsRef<str>,
        manifest: &ProviderAdapterManifest,
        gateway_token: Option<String>,
    ) -> Result<Self, String> {
        let routes = Self::routes_from_manifest(manifest, Some(adapter_base_url.as_ref()))?;
        Self::from_routes(routes, gateway_token)
    }

    pub fn from_optional_parts(
        adapter_json: Option<String>,
        gateway_token: Option<String>,
    ) -> Result<Option<Self>, String> {
        let Some(adapter_json) = normalize_optional_string(adapter_json.as_deref()) else {
            return Ok(None);
        };
        let config = Self::from_json(adapter_json, gateway_token)?;
        if config.routes.is_empty() {
            Ok(None)
        } else {
            Ok(Some(config))
        }
    }

    pub fn from_optional_manifest_parts(
        adapter_base_url: Option<String>,
        manifest_json: Option<String>,
        gateway_token: Option<String>,
    ) -> Result<Option<Self>, String> {
        let Some(manifest_json) = normalize_optional_string(manifest_json.as_deref()) else {
            return Ok(None);
        };
        let config = Self::from_manifest_json(
            adapter_base_url.unwrap_or_default(),
            manifest_json,
            gateway_token,
        )?;
        if config.routes.is_empty() {
            Ok(None)
        } else {
            Ok(Some(config))
        }
    }

    pub fn from_env() -> Result<Option<Self>, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        let adapter_json = crate::runtime::config_file_value(
            Self::ENV_PROVIDER_ADAPTER_JSON,
            Self::ENV_PROVIDER_ADAPTER_JSON_FILE,
            runtime_toml.and_then(|config| config.provider_adapter.json.as_deref()),
            runtime_toml.and_then(|config| config.provider_adapter.json_file.as_deref()),
        )?;
        let gateway_token = crate::runtime::config_secret_value(
            Self::ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN,
            Self::ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE,
            runtime_toml.and_then(|config| config.provider_adapter.gateway_token.as_deref()),
            runtime_toml.and_then(|config| config.provider_adapter.gateway_token_file.as_deref()),
        )?;
        if adapter_json.is_some() {
            return Self::from_optional_parts(adapter_json, gateway_token);
        }

        let adapter_base_url = crate::runtime::config_value(
            Self::ENV_PROVIDER_ADAPTER_BASE_URL,
            runtime_toml.and_then(|config| config.provider_adapter.adapter_base_url.as_deref()),
        );
        let manifest_json = crate::runtime::config_file_value(
            Self::ENV_PROVIDER_ADAPTER_MANIFEST,
            Self::ENV_PROVIDER_ADAPTER_MANIFEST_FILE,
            runtime_toml.and_then(|config| config.provider_adapter.manifest.as_deref()),
            runtime_toml.and_then(|config| config.provider_adapter.manifest_file.as_deref()),
        )?;
        Self::from_optional_manifest_parts(adapter_base_url, manifest_json, gateway_token)
    }

    pub fn routes(&self) -> &[ProviderAdapterRouteConfig] {
        self.routes.as_slice()
    }

    pub fn gateway_token(&self) -> &str {
        self.gateway_token.as_str()
    }

    fn from_routes(
        routes: Vec<ProviderAdapterRouteConfig>,
        gateway_token: Option<String>,
    ) -> Result<Self, String> {
        if routes.is_empty() {
            return Ok(Self {
                routes,
                gateway_token: String::new(),
            });
        }
        let gateway_token =
            normalize_optional_string(gateway_token.as_deref()).ok_or_else(|| {
                format!(
                    "{} is required when provider adapter config has adapter routes",
                    Self::ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN
                )
            })?;
        let routes = routes
            .into_iter()
            .map(normalize_route)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Self {
            routes,
            gateway_token,
        })
    }

    fn from_json_config(
        config: ProviderAdapterJsonConfig,
        gateway_token: Option<String>,
    ) -> Result<Self, String> {
        let mut routes = config.routes;
        if let Some(manifest) = config.manifest {
            routes.extend(Self::routes_from_manifest(
                &manifest,
                config.adapter_base_url.as_deref(),
            )?);
        }
        Self::from_routes(routes, gateway_token)
    }

    fn routes_from_manifest(
        manifest: &ProviderAdapterManifest,
        adapter_base_url: Option<&str>,
    ) -> Result<Vec<ProviderAdapterRouteConfig>, String> {
        let adapter_base_url = normalize_optional_string(adapter_base_url).unwrap_or_default();
        ProviderAdapterSnapshot::from_manifest(manifest, adapter_base_url)
            .map(|snapshot| snapshot.routes)
            .map_err(|error| {
                if error == "adapter base URL must not be blank" {
                    "provider adapter manifest config requires adapterBaseUrl or adapter_base_url"
                        .to_owned()
                } else {
                    format!("provider adapter manifest config is invalid: {error}")
                }
            })
    }
}

impl ProviderAdapterManifestDiscoveryConfig {
    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        let adapter_json = crate::runtime::config_file_value(
            ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_JSON,
            ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_JSON_FILE,
            runtime_toml.and_then(|config| config.provider_adapter.json.as_deref()),
            runtime_toml.and_then(|config| config.provider_adapter.json_file.as_deref()),
        )?;
        if adapter_json.is_some() {
            return Ok(None);
        }

        let manifest_json = crate::runtime::config_file_value(
            ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_MANIFEST,
            ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_MANIFEST_FILE,
            runtime_toml.and_then(|config| config.provider_adapter.manifest.as_deref()),
            runtime_toml.and_then(|config| config.provider_adapter.manifest_file.as_deref()),
        )?;
        if manifest_json.is_some() {
            return Ok(None);
        }

        let Some(adapter_base_url) = crate::runtime::config_value(
            ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_BASE_URL,
            runtime_toml.and_then(|config| config.provider_adapter.adapter_base_url.as_deref()),
        ) else {
            return Ok(None);
        };
        let adapter_base_url = required_text(
            "provider adapter discovery adapterBaseUrl",
            adapter_base_url.as_str(),
        )?
        .trim_end_matches('/')
        .to_owned();
        let gateway_token = crate::runtime::config_secret_value(
            ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN,
            ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE,
            runtime_toml.and_then(|config| config.provider_adapter.gateway_token.as_deref()),
            runtime_toml.and_then(|config| config.provider_adapter.gateway_token_file.as_deref()),
        )?;
        let gateway_token =
            normalize_optional_string(gateway_token.as_deref()).ok_or_else(|| {
                format!(
                    "{} is required when provider adapter manifest discovery is enabled",
                    ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN
                )
            })?;
        Ok(Some(Self {
            adapter_base_url,
            gateway_token,
        }))
    }

    pub fn adapter_base_url(&self) -> &str {
        self.adapter_base_url.as_str()
    }

    pub fn gateway_token(&self) -> &str {
        self.gateway_token.as_str()
    }
}

fn normalize_route(
    mut route: ProviderAdapterRouteConfig,
) -> Result<ProviderAdapterRouteConfig, String> {
    route.provider_code = required_text(
        "provider adapter route providerCode",
        route.provider_code.as_str(),
    )?;
    route.adapter_base_url = required_text(
        "provider adapter route adapterBaseUrl",
        route.adapter_base_url.as_str(),
    )?
    .trim_end_matches('/')
    .to_owned();
    route.capability = normalize_optional_string(route.capability.as_deref());
    route.endpoint_key = normalize_optional_string(route.endpoint_key.as_deref());
    route.method =
        required_text("provider adapter route method", route.method.as_str())?.to_ascii_uppercase();
    route.standard_path_pattern = required_path(
        "provider adapter route standardPathPattern",
        route.standard_path_pattern.as_str(),
    )?;
    route.adapter_path_template = required_path(
        "provider adapter route adapterPathTemplate",
        route.adapter_path_template.as_str(),
    )?;
    Ok(route)
}

fn required_text(label: &str, value: &str) -> Result<String, String> {
    normalize_optional_string(Some(value)).ok_or_else(|| format!("{label} must not be blank"))
}

fn required_path(label: &str, value: &str) -> Result<String, String> {
    let value = required_text(label, value)?;
    if value.starts_with('/') {
        Ok(value)
    } else {
        Ok(format!("/{value}"))
    }
}

fn normalize_optional_string(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .map(str::to_owned)
        .filter(|value| !value.is_empty())
}

impl fmt::Debug for ProviderAdapterConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ProviderAdapterConfig")
            .field("routes", &self.routes)
            .field("gateway_token", &"[REDACTED]")
            .finish()
    }
}

impl fmt::Debug for ProviderAdapterManifestDiscoveryConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ProviderAdapterManifestDiscoveryConfig")
            .field("adapter_base_url", &self.adapter_base_url)
            .field("gateway_token", &"[REDACTED]")
            .finish()
    }
}
