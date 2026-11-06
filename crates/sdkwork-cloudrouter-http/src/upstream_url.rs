//! Upstream base-URL shape helpers shared by every provider transport.
//!
//! Three transports compose an upstream URI from a configured base URL and the
//! inbound API path: the OpenAI-compatible relay
//! (`infrastructure::provider::openai_compatible_relay`), the invocation
//! pipeline (`application::invocation::provider_request`), and the edge
//! passthrough (`provider_passthrough_transport`). They all face the same
//! question:
//!
//! > does the base URL already carry the API version segment, or must the
//! > inbound `/v1/...` path contribute it?
//!
//! The catalog publishes the answer as `<host, pathPrefix>` pairs
//! (`sdkwork-models/models/<vendor>/<region>/vendor.json#protocolBaseUrls`),
//! and the seeded official accounts project `host + pathPrefix` into the
//! supplier's per-protocol base URL. A prefix therefore comes in several
//! shapes, not just `/v1`:
//!
//! | vendor      | protocol            | base URL path              |
//! |-------------|---------------------|----------------------------|
//! | OpenAI      | openai_compatible   | `/v1`                      |
//! | Alibaba     | openai_compatible   | `/compatible-mode/v1`      |
//! | ByteDance   | openai_compatible   | `/api/v3`                  |
//! | Baidu       | openai_compatible   | `/v2`                      |
//! | Zhipu       | openai_compatible   | `/api/paas/v4`             |
//! | Gemini      | openai_compatible   | `/v1beta/openai`           |
//! | DeepSeek    | anthropic_messages  | `/anthropic`               |
//! | StepFun     | anthropic_messages  | `/step_plan`               |
//!
//! The first six are OpenAI-family bases: they are complete `base_url` values
//! in the OpenAI SDK sense, so the SDK appends only the operation path
//! (`/chat/completions`, `/responses`, `/embeddings`) and the inbound `/v1`
//! must be dropped. The last two are Anthropic-family *surface* prefixes: the
//! Anthropic SDK still supplies `/v1`, so the inbound `/v1` must be kept.
//!
//! Before this helper the transports recognised only bases whose path was
//! exactly `/v1` (or ended with `/v1`). Every non-`/v1` OpenAI prefix above was
//! therefore composed as `base + /v1 + op`, dialing a path the vendor does not
//! serve (`https://qianfan.baidubce.com/v2/v1/chat/completions`,
//! `https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions`)
//! while the published contract and every static gate stayed green.

/// Whether an upstream base URL's path already carries the API version segment.
///
/// Recognised shapes:
/// - the path ends with `/v1` (`/v1`, `/compatible-mode/v1`, `/openai/v1`);
/// - the path ends with `/v1beta/openai` (Gemini's OpenAI-compatible face);
/// - the final path segment is a bare version token (`/api/v3`, `/v2`,
///   `/api/paas/v4`).
///
/// An empty path, or an opaque operator prefix such as `/dashscope-cn` or
/// `/anthropic`, is *not* a version prefix: the inbound path must keep its
/// `/v1`, which is what both the OpenAI SDK on a bare host and the Anthropic
/// SDK on a surface prefix do.
pub fn path_carries_version_prefix(path: &str) -> bool {
    let path = path.trim_end_matches('/');
    if path.is_empty() {
        return false;
    }
    if path == "/v1" || path.ends_with("/v1") {
        return true;
    }
    if path.ends_with("/v1beta/openai") {
        return true;
    }
    let last = path.rsplit('/').next().unwrap_or_default();
    let mut chars = last.chars();
    matches!(chars.next(), Some('v'))
        && chars.clone().count() > 0
        && chars.all(|character| character.is_ascii_digit())
}

/// The path to dial for `inbound_path` when `base_url_path` is the base URL's
/// path component.
///
/// Drops a leading `/v1` only when the base URL already carries the version
/// prefix; otherwise the inbound path is returned unchanged. The caller still
/// concatenates `base_url + returned path`.
pub fn upstream_path_without_version_duplication<'a>(
    base_url_path: &str,
    inbound_path: &'a str,
) -> &'a str {
    if path_carries_version_prefix(base_url_path)
        && (inbound_path == "/v1" || inbound_path.starts_with("/v1/"))
    {
        inbound_path.strip_prefix("/v1").unwrap_or(inbound_path)
    } else {
        inbound_path
    }
}

#[cfg(test)]
mod tests {
    use super::{path_carries_version_prefix, upstream_path_without_version_duplication};

    #[test]
    fn recognises_every_published_openai_family_prefix() {
        for path in [
            "/v1",
            "/compatible-mode/v1",
            "/openai/v1",
            "/api/v3",
            "/v2",
            "/api/paas/v4",
            "/v1beta/openai",
        ] {
            assert!(
                path_carries_version_prefix(path),
                "{path} must be a version prefix"
            );
        }
    }

    #[test]
    fn keeps_anthropic_surface_prefixes_and_bare_hosts_out() {
        for path in [
            "",
            "/",
            "/anthropic",
            "/apps/anthropic",
            "/api/anthropic",
            "/step_plan",
            "/dashscope-cn",
        ] {
            assert!(
                !path_carries_version_prefix(path),
                "{path} must not be treated as a version prefix"
            );
        }
    }

    #[test]
    fn drops_the_inbound_v1_only_for_openai_family_bases() {
        assert_eq!(
            "/chat/completions",
            upstream_path_without_version_duplication("/v1", "/v1/chat/completions")
        );
        assert_eq!(
            "/chat/completions",
            upstream_path_without_version_duplication("/api/v3", "/v1/chat/completions")
        );
        assert_eq!(
            "/chat/completions",
            upstream_path_without_version_duplication("/v1beta/openai", "/v1/chat/completions")
        );
        assert_eq!(
            "/responses",
            upstream_path_without_version_duplication("/api/paas/v4", "/v1/responses")
        );
        // Anthropic keeps the SDK-supplied version segment.
        assert_eq!(
            "/v1/messages",
            upstream_path_without_version_duplication("/anthropic", "/v1/messages")
        );
        // A bare host keeps the inbound version segment.
        assert_eq!(
            "/v1/chat/completions",
            upstream_path_without_version_duplication("", "/v1/chat/completions")
        );
    }
}
