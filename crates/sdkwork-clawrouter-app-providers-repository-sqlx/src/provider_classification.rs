pub(crate) fn provider_family_code(supplier_code: &str, default_vendor_code: &str) -> String {
    let provider = supplier_code.trim().to_lowercase();
    let vendor = default_vendor_code.trim().to_lowercase();

    if provider_contains_any(&provider, &["openrouter", "opencode", "router"]) {
        "opencode"
    } else if provider_or_vendor_contains_any(&provider, &vendor, &["anthropic", "claude"]) {
        "claude"
    } else if provider_or_vendor_contains_any(&provider, &vendor, &["google", "gemini", "vertex"]) {
        "gemini"
    } else if provider_or_vendor_contains_any(&provider, &vendor, &["openai", "codex", "azure"]) {
        "codex"
    } else {
        "opencode"
    }
    .to_owned()
}

fn provider_contains_any(provider: &str, markers: &[&str]) -> bool {
    markers.iter().any(|marker| provider.contains(marker))
}

fn provider_or_vendor_contains_any(provider: &str, vendor: &str, markers: &[&str]) -> bool {
    markers
        .iter()
        .any(|marker| provider.contains(marker) || vendor.contains(marker))
}

#[cfg(test)]
mod tests {
    use super::provider_family_code;

    #[test]
    fn provider_family_code_keeps_relay_family_separate_from_default_vendor() {
        assert_eq!("opencode", provider_family_code("openrouter", "openai"));
        assert_eq!(
            "opencode",
            provider_family_code("custom-router", "anthropic")
        );
    }

    #[test]
    fn provider_family_code_classifies_direct_and_cloud_provider_families() {
        assert_eq!("codex", provider_family_code("azure-openai", "openai"));
        assert_eq!("claude", provider_family_code("bedrock", "anthropic"));
        assert_eq!("gemini", provider_family_code("vertex-ai", "google"));
    }
}
