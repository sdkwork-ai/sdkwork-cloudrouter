use sdkwork_web_core::{SecurityPolicy, WebEnvironment};

fn parse_environment(value: Option<String>) -> WebEnvironment {
    match value
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "dev" | "development" => WebEnvironment::Dev,
        "test" | "testing" => WebEnvironment::Test,
        _ => WebEnvironment::Prod,
    }
}

fn first_nonempty_env(keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        std::env::var(key)
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    })
}

fn cors_allowed_origins_from_env() -> Vec<String> {
    first_nonempty_env(&["SDKWORK_CLAW_EDGE_CORS_ALLOWED_ORIGINS"])
        .map(|value| split_env_list(&value))
        .unwrap_or_default()
}

fn split_env_list(value: &str) -> Vec<String> {
    value
        .split([',', ';', '\n'])
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

/// Resolve the canonical SDKWork web environment for Claw Router HTTP services.
pub fn resolve_claw_web_environment_from_process_env() -> WebEnvironment {
    parse_environment(first_nonempty_env(&[
        "SDKWORK_CLAW_ENVIRONMENT",
        "SDKWORK_IM_ENVIRONMENT",
        "SDKWORK_ENV",
    ]))
}

/// Claw Router HTTP service security policy aligned with IAM/Drive dev bootstrap behavior.
pub fn claw_service_security_policy(environment: &WebEnvironment) -> SecurityPolicy {
    let mut security_policy = if matches!(environment, WebEnvironment::Dev | WebEnvironment::Test) {
        SecurityPolicy::default()
    } else {
        SecurityPolicy::production()
    };
    if matches!(environment, WebEnvironment::Dev | WebEnvironment::Test) {
        security_policy.cors.allow_all_origins = true;
        security_policy
            .cross_site
            .reject_untrusted_state_changing_origins = false;
        security_policy.cross_site.reject_cookie_auth_without_origin = false;
    } else {
        security_policy.cors.allowed_origins = cors_allowed_origins_from_env();
    }
    security_policy
}

#[cfg(test)]
mod tests {
    use super::{
        claw_service_security_policy, resolve_claw_web_environment_from_process_env, split_env_list,
    };
    use sdkwork_web_core::WebEnvironment;

    #[test]
    fn dev_security_policy_allows_browser_origins() {
        let policy = claw_service_security_policy(&WebEnvironment::Dev);
        assert!(policy.cors.allow_all_origins);
        assert!(!policy.cross_site.reject_untrusted_state_changing_origins);
    }

    #[test]
    fn production_security_policy_rejects_permissive_cors() {
        let policy = claw_service_security_policy(&WebEnvironment::Prod);
        assert!(!policy.cors.allow_all_origins);
    }

    #[test]
    fn resolve_environment_from_claw_env_key() {
        unsafe {
            std::env::set_var("SDKWORK_CLAW_ENVIRONMENT", "development");
        }
        assert_eq!(
            resolve_claw_web_environment_from_process_env(),
            WebEnvironment::Dev
        );
        unsafe {
            std::env::remove_var("SDKWORK_CLAW_ENVIRONMENT");
        }
    }

    #[test]
    fn split_env_list_splits_commas_and_whitespace() {
        assert_eq!(
            split_env_list("https://a.example.com, https://b.example.com"),
            vec![
                "https://a.example.com".to_owned(),
                "https://b.example.com".to_owned(),
            ]
        );
    }
}
