use crate::domain::RoutingCapability;
use crate::ports::{AccountBaseUrlConfig, AdminLlmProtocolConfig, LlmProtocolCode};

/// 按请求资源能力与 LLM 协议判定最终调用 Base URL（账号配置 > 供应商配置 > 端点解析结果）。
///
/// `route_base_url` 是既有行级解析结果（端点 Base URL，端点缺失时以供应商默认
/// Base URL 兜底，见 rows.rs `UpstreamAccountRouteRow::try_into_domain`）：
/// - LLM（协议 P）：account.protocols[P] → account.default → supplier.protocols[P] → supplier.default → route_base_url
/// - 非 LLM / 无协议：account.default → supplier.default → route_base_url
///
/// 账号接入区分为「官方直连」或「中转站」，两者都挂在某个供应商(supplier)下：
/// 账号未配置专属 base_url 时采用该供应商的 base_url；供应商也未配置时，
/// 应上报具体的 base_url 错误（见 [`describe_base_url_missing`]），而不是回退成泛化的空快照 503。
pub(crate) fn resolve_upstream_base_url(
    capability: RoutingCapability,
    protocol: Option<LlmProtocolCode>,
    account_config: Option<&AccountBaseUrlConfig>,
    supplier_default_base_url: Option<String>,
    route_base_url: Option<String>,
) -> Option<String> {
    if let Some(config) = account_config {
        if let Some(protocol) = protocol {
            if let Some(url) = protocol_base_url(&config.account_protocol_base_urls, protocol) {
                return Some(url);
            }
        }
        if let Some(default_url) = config
            .account_default_base_url
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            return Some(default_url.to_owned());
        }
        if let Some(protocol) = protocol {
            if let Some(url) = protocol_base_url(&config.supplier_protocol_base_urls, protocol) {
                return Some(url);
            }
        }
    }
    // 供应商级默认 Base URL 兜底对 官方/中转站 一律生效（不限 chat/非 chat），
    // 以满足「账号未配置则采用供应商配置」的接入语义。
    if let Some(default_url) = supplier_default_base_url {
        let trimmed = default_url.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_owned());
        }
    }
    let _ = capability;
    route_base_url
}

/// 描述一次 base URL 解析失败的**具体**原因（按供应商/账号/端点区分），
/// 用于在“供应商与账号都无 base_url 时”给出可读可定位的错误，而非泛化 503。
pub(crate) fn describe_base_url_missing(
    account_id: i64,
    supplier_code: &str,
    vendor_code: Option<&str>,
    catalog_key: &str,
    account_config: Option<&AccountBaseUrlConfig>,
    supplier_default_base_url: Option<&str>,
    route_base_url: Option<&str>,
    protocol: Option<LlmProtocolCode>,
) -> String {
    let protocol_label = protocol
        .map(|p| format!("{p:?}"))
        .unwrap_or_else(|| "default (无协议)".to_owned());
    let vendor_label = vendor_code.unwrap_or("<unknown vendor>");
    let mut checked = Vec::new();
    if let Some(config) = account_config {
        if account_has_protocol_base_url(&config.account_protocol_base_urls, protocol) {
            checked.push("account.protocols");
        }
        let has_account_default = config
            .account_default_base_url
            .as_deref()
            .is_some_and(|v| !v.trim().is_empty());
        if has_account_default {
            checked.push("account.default");
        }
        if account_has_protocol_base_url(&config.supplier_protocol_base_urls, protocol) {
            checked.push("supplier.protocols");
        }
    }
    let has_supplier_default = supplier_default_base_url.is_some_and(|v| !v.trim().is_empty());
    if has_supplier_default {
        checked.push("supplier.default");
    }
    if route_base_url.is_some_and(|v| !v.trim().is_empty()) {
        checked.push("route/endpoint");
    }

    format!(
        "provider base URL is not configured for vendor '{vendor_label}' / supplier '{supplier_code}' \
         (account {account_id}, model {catalog_key}, protocol {protocol_label}); \
         neither the account nor the supplier provides a base URL \
         (checked: {})",
        if checked.is_empty() {
            "none configured".to_owned()
        } else {
            checked.join(", ")
        }
    )
}

fn account_has_protocol_base_url(
    configs: &[AdminLlmProtocolConfig],
    protocol: Option<LlmProtocolCode>,
) -> bool {
    protocol
        .and_then(|protocol| protocol_base_url(configs, protocol))
        .is_some()
}

/// api_code → LLM 协议映射（宽松匹配，覆盖 chat_completions / responses /
/// completions / anthropic.messages 等取值；embeddings 等无协议资源返回 None，
/// 走默认 Base URL 链）。
pub(crate) fn protocol_code_from_api_code(api_code: Option<&str>) -> Option<LlmProtocolCode> {
    let api_code = api_code?.trim().to_ascii_lowercase();
    if api_code.contains("anthropic") {
        Some(LlmProtocolCode::AnthropicMessages)
    } else if api_code.contains("responses") {
        Some(LlmProtocolCode::OpenaiResponses)
    } else if api_code.contains("chat") || api_code.contains("completion") {
        Some(LlmProtocolCode::OpenaiChatCompletions)
    } else {
        None
    }
}

fn protocol_base_url(
    configs: &[AdminLlmProtocolConfig],
    protocol: LlmProtocolCode,
) -> Option<String> {
    configs
        .iter()
        .find(|config| config.protocol_code == protocol)
        .map(|config| config.base_url.trim())
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::AdminLlmProtocolConfig;

    fn config(
        account_default: Option<&str>,
        account_protocols: Vec<(&str, &str)>,
        supplier_protocols: Vec<(&str, &str)>,
    ) -> AccountBaseUrlConfig {
        AccountBaseUrlConfig {
            account_default_base_url: account_default.map(ToOwned::to_owned),
            account_protocol_base_urls: account_protocols
                .into_iter()
                .map(|(protocol_code, base_url)| AdminLlmProtocolConfig {
                    protocol_code: LlmProtocolCode::parse(protocol_code).unwrap(),
                    base_url: base_url.to_owned(),
                })
                .collect(),
            supplier_protocol_base_urls: supplier_protocols
                .into_iter()
                .map(|(protocol_code, base_url)| AdminLlmProtocolConfig {
                    protocol_code: LlmProtocolCode::parse(protocol_code).unwrap(),
                    base_url: base_url.to_owned(),
                })
                .collect(),
        }
    }

    fn chat(api_code: &str) -> (RoutingCapability, Option<LlmProtocolCode>) {
        (
            RoutingCapability::Chat,
            protocol_code_from_api_code(Some(api_code)),
        )
    }

    #[test]
    fn account_protocol_override_wins_over_everything() {
        let account = config(
            Some("https://account-default.example.com"),
            vec![(
                "openai_chat_completions",
                "https://account-chat.example.com",
            )],
            vec![(
                "openai_chat_completions",
                "https://supplier-chat.example.com",
            )],
        );
        let (capability, protocol) = chat("openai.chat_completions");
        assert_eq!(
            Some("https://account-chat.example.com".to_owned()),
            resolve_upstream_base_url(
                capability,
                protocol,
                Some(&account),
                Some("https://supplier-default.example.com".to_owned()),
                Some("https://endpoint.example.com".to_owned()),
            )
        );
    }

    #[test]
    fn account_default_beats_supplier_protocol_and_endpoint() {
        let account = config(
            Some("https://account-default.example.com"),
            vec![],
            vec![(
                "openai_chat_completions",
                "https://supplier-chat.example.com",
            )],
        );
        let (capability, protocol) = chat("openai.chat_completions");
        assert_eq!(
            Some("https://account-default.example.com".to_owned()),
            resolve_upstream_base_url(
                capability,
                protocol,
                Some(&account),
                Some("https://supplier-default.example.com".to_owned()),
                Some("https://endpoint.example.com".to_owned()),
            )
        );
    }

    #[test]
    fn supplier_protocol_beats_endpoint_for_chat() {
        let account = config(
            None,
            vec![],
            vec![(
                "anthropic_messages",
                "https://supplier-anthropic.example.com",
            )],
        );
        let (capability, protocol) = chat("anthropic.messages");
        assert_eq!(
            Some("https://supplier-anthropic.example.com".to_owned()),
            resolve_upstream_base_url(
                capability,
                protocol,
                Some(&account),
                None,
                Some("https://endpoint.example.com".to_owned()),
            )
        );
    }

    #[test]
    fn chat_uses_supplier_default_when_account_has_no_protocol_or_default() {
        // 官方/中转站语义：账号未配置 base_url 时采用供应商默认 base_url（chat 同样生效）。
        let (capability, protocol) = chat("openai.chat_completions");
        assert_eq!(
            Some("https://supplier-default.example.com".to_owned()),
            resolve_upstream_base_url(
                capability,
                protocol,
                None,
                Some("https://supplier-default.example.com".to_owned()),
                Some("https://endpoint.example.com".to_owned()),
            )
        );
    }

    #[test]
    fn endpoint_is_last_resort_when_neither_account_nor_supplier_has_base_url() {
        let (capability, protocol) = chat("openai.responses");
        assert_eq!(
            Some("https://endpoint.example.com".to_owned()),
            resolve_upstream_base_url(
                capability,
                protocol,
                None,
                None,
                Some("https://endpoint.example.com".to_owned()),
            )
        );
    }

    #[test]
    fn non_chat_prefers_account_default_then_supplier_default() {
        let account = config(
            Some("https://account-default.example.com"),
            vec![],
            vec![(
                "openai_chat_completions",
                "https://supplier-chat.example.com",
            )],
        );
        assert_eq!(
            Some("https://account-default.example.com".to_owned()),
            resolve_upstream_base_url(
                RoutingCapability::Image,
                None,
                Some(&account),
                Some("https://supplier-default.example.com".to_owned()),
                Some("https://endpoint.example.com".to_owned()),
            )
        );
        let without_account = config(None, vec![], vec![]);
        assert_eq!(
            Some("https://supplier-default.example.com".to_owned()),
            resolve_upstream_base_url(
                RoutingCapability::Image,
                None,
                Some(&without_account),
                Some("https://supplier-default.example.com".to_owned()),
                Some("https://endpoint.example.com".to_owned()),
            )
        );
    }

    #[test]
    fn protocol_code_from_api_code_maps_common_surfaces() {
        assert_eq!(
            Some(LlmProtocolCode::OpenaiChatCompletions),
            protocol_code_from_api_code(Some("openai.chat_completions"))
        );
        assert_eq!(
            Some(LlmProtocolCode::OpenaiResponses),
            protocol_code_from_api_code(Some("openai.responses"))
        );
        assert_eq!(
            Some(LlmProtocolCode::AnthropicMessages),
            protocol_code_from_api_code(Some("anthropic.messages"))
        );
        assert_eq!(
            Some(LlmProtocolCode::OpenaiChatCompletions),
            protocol_code_from_api_code(Some("chat_completions"))
        );
        assert_eq!(None, protocol_code_from_api_code(Some("openai.embeddings")));
        assert_eq!(None, protocol_code_from_api_code(None));
    }

    #[test]
    fn describe_base_url_missing_names_vendor_supplier_and_checked_sources() {
        let account = config(None, vec![], vec![]);
        let message = describe_base_url_missing(
            3001,
            "openai",
            Some("OpenAI"),
            "openai/gpt-4o-mini",
            Some(&account),
            None,
            None,
            Some(LlmProtocolCode::OpenaiChatCompletions),
        );
        assert!(message.contains("vendor 'OpenAI'"), "must name vendor: {message}");
        assert!(message.contains("supplier 'openai'"), "must name supplier: {message}");
        assert!(message.contains("account 3001"), "must name account: {message}");
        assert!(message.contains("openai/gpt-4o-mini"), "must name model: {message}");
        assert!(message.contains("none configured"), "must report no source: {message}");

        // With sources present but account/supplier empty, they are listed.
        let with_supplier_default = describe_base_url_missing(
            3001,
            "openai",
            Some("OpenAI"),
            "openai/gpt-4o-mini",
            None,
            Some("https://api.openai.com"),
            None,
            None,
        );
        assert!(
            with_supplier_default.contains("supplier.default") || with_supplier_default.is_empty(),
            "message should reflect optionally present sources: {with_supplier_default}"
        );
    }

    #[test]
    fn chat_without_any_base_url_source_resolves_to_none() {
        let (capability, protocol) = chat("openai.chat_completions");
        assert_eq!(
            None,
            resolve_upstream_base_url(capability, protocol, None, None, None)
        );
    }
}
