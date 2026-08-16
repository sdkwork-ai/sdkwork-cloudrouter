use crate::domain::RoutingCapability;
use crate::ports::{AccountBaseUrlConfig, AdminLlmProtocolConfig, LlmProtocolCode};

/// 按请求资源能力与 LLM 协议判定最终调用 Base URL（账号配置 > 供应商配置 > 端点解析结果）。
///
/// `route_base_url` 是既有行级解析结果（端点 Base URL，端点缺失时以供应商默认
/// Base URL 兜底，见 rows.rs `UpstreamAccountRouteRow::try_into_domain`）：
/// - LLM（协议 P）：account.protocols[P] → account.default → supplier.protocols[P] → route_base_url
/// - 非 LLM / 无协议：account.default → supplier.default → route_base_url
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
    if capability != RoutingCapability::Chat {
        if let Some(default_url) = supplier_default_base_url {
            let trimmed = default_url.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_owned());
            }
        }
    }
    route_base_url
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
    fn chat_falls_back_to_existing_endpoint_resolution() {
        let (capability, protocol) = chat("openai.responses");
        assert_eq!(
            Some("https://endpoint.example.com".to_owned()),
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
}
