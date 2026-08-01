use sdkwork_claw_provider_adapter_contract::AdapterRouteStatus;

use crate::config::{ProviderAdapterLookup, ProviderAdapterRouteConfig};

#[derive(Debug, Clone, PartialEq, Eq)]
#[allow(clippy::large_enum_variant)]
pub enum ProviderInvocationMode {
    DirectHttp,
    InternalHttpAdapter(ProviderAdapterRouteConfig),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderAdapterResolution {
    pub mode: ProviderInvocationMode,
}

impl ProviderAdapterResolution {
    pub fn direct_http() -> Self {
        Self {
            mode: ProviderInvocationMode::DirectHttp,
        }
    }

    pub fn internal_http_adapter(route: ProviderAdapterRouteConfig) -> Self {
        Self {
            mode: ProviderInvocationMode::InternalHttpAdapter(route),
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ProviderAdapterRegistry {
    routes: Vec<ProviderAdapterRouteConfig>,
}

impl ProviderAdapterRegistry {
    pub fn new(routes: Vec<ProviderAdapterRouteConfig>) -> Self {
        Self { routes }
    }

    pub fn resolve(&self, lookup: &ProviderAdapterLookup<'_>) -> ProviderAdapterResolution {
        self.resolve_with_path_metadata_fallback(lookup, false)
    }

    pub fn resolve_standard_path(
        &self,
        lookup: &ProviderAdapterLookup<'_>,
    ) -> ProviderAdapterResolution {
        self.resolve_with_path_metadata_fallback(lookup, true)
    }

    pub fn resolve_standard_path_metadata(
        &self,
        method: &str,
        standard_path: &str,
    ) -> Option<ProviderAdapterRouteConfig> {
        self.routes
            .iter()
            .filter(|route| route.status == AdapterRouteStatus::Enabled)
            .filter(|route| value_eq(route.method.as_str(), method))
            .filter_map(|route| {
                let path_score =
                    path_match_score(route.standard_path_pattern.as_str(), standard_path)?;
                (path_score >= 100).then_some((route.priority, route))
            })
            .max_by_key(|(priority, _)| *priority)
            .map(|(_, route)| route.clone())
    }

    fn resolve_with_path_metadata_fallback(
        &self,
        lookup: &ProviderAdapterLookup<'_>,
        allow_exact_path_metadata_fallback: bool,
    ) -> ProviderAdapterResolution {
        self.routes
            .iter()
            .filter(|route| route.status == AdapterRouteStatus::Enabled)
            .filter(|route| value_eq(route.supplier_code.as_str(), lookup.supplier_code))
            .filter(|route| value_eq(route.method.as_str(), lookup.method))
            .filter_map(|route| {
                let path_score =
                    path_match_score(route.standard_path_pattern.as_str(), lookup.standard_path)?;
                if allow_exact_path_metadata_fallback
                    && (lookup.capability.is_none() || lookup.endpoint_key.is_none())
                    && path_score < 100
                {
                    return None;
                }
                let allow_metadata_fallback =
                    allow_exact_path_metadata_fallback && path_score >= 100;
                if !optional_matches(
                    route.capability.as_deref(),
                    lookup.capability,
                    allow_metadata_fallback,
                ) || !endpoint_key_matches(
                    route.endpoint_key.as_deref(),
                    lookup.endpoint_key,
                    allow_metadata_fallback,
                ) {
                    return None;
                }
                let endpoint_score = route.endpoint_key.as_ref().map(|_| 1).unwrap_or(0);
                let capability_score = route.capability.as_ref().map(|_| 1).unwrap_or(0);
                Some((path_score, endpoint_score, capability_score, route))
            })
            .max_by_key(|(path_score, endpoint_score, capability_score, route)| {
                (
                    *path_score,
                    *endpoint_score,
                    *capability_score,
                    route.priority,
                )
            })
            .map(|(_, _, _, route)| ProviderAdapterResolution::internal_http_adapter(route.clone()))
            .unwrap_or_else(ProviderAdapterResolution::direct_http)
    }
}

fn value_eq(left: &str, right: &str) -> bool {
    left.trim().eq_ignore_ascii_case(right.trim())
}

fn optional_matches(configured: Option<&str>, lookup: Option<&str>, allow_missing: bool) -> bool {
    match configured {
        Some(configured) => lookup
            .map(|lookup| value_eq(configured, lookup))
            .unwrap_or(allow_missing),
        None => true,
    }
}

fn endpoint_key_matches(
    configured: Option<&str>,
    lookup: Option<&str>,
    allow_exact_path_alias: bool,
) -> bool {
    match configured {
        Some(configured) => lookup
            .map(|lookup| {
                value_eq(configured, lookup)
                    || (allow_exact_path_alias && endpoint_key_alias_eq(configured, lookup))
            })
            .unwrap_or(allow_exact_path_alias),
        None => true,
    }
}

fn endpoint_key_alias_eq(configured: &str, lookup: &str) -> bool {
    let configured = endpoint_key_aliases(configured);
    let lookup = endpoint_key_aliases(lookup);
    configured
        .iter()
        .any(|configured| lookup.iter().any(|lookup| configured == lookup))
}

fn endpoint_key_aliases(value: &str) -> Vec<String> {
    let value = value.trim().to_ascii_lowercase();
    let suffix = value.rsplit('.').next().unwrap_or(value.as_str());
    let mut aliases = vec![canonical_endpoint_key(value.as_str())];
    let suffix = canonical_endpoint_key(suffix);
    if aliases.first() != Some(&suffix) {
        aliases.push(suffix);
    }
    aliases
}

fn canonical_endpoint_key(value: &str) -> String {
    value
        .replace("_to_", "2")
        .replace("-to-", "2")
        .replace(".to.", "2")
        .replace("/to/", "2")
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .collect()
}

fn path_match_score(pattern: &str, path: &str) -> Option<i32> {
    let pattern = normalize_path(pattern);
    let path = normalize_path(path);
    if pattern == path {
        return Some(100);
    }
    if pattern == "/*" {
        return Some(1);
    }
    if let Some(prefix) = pattern.strip_suffix("/*") {
        if path == prefix || path.starts_with(&format!("{prefix}/")) {
            return Some(10);
        }
    }
    None
}

fn normalize_path(value: &str) -> String {
    let value = value.trim();
    if value.starts_with('/') {
        value.to_owned()
    } else {
        format!("/{value}")
    }
}
