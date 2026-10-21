//! Contract guard for HTTP DTO wire names.
//!
//! HTTP query DTOs must accept the canonical lower_snake_case wire names
//! (`page`, `page_size`, ...). Camel-case renaming is reserved for JSON bodies
//! and JSON responses, and for generated SDK method parameters. The previous
//! guard only recognised `#[serde(rename_all = "camelCase")]` written alone and
//! only struct names ending in `Query`, so `*QueryRequest` DTOs using
//! `#[serde(rename_all = "camelCase", deny_unknown_fields)]` silently accepted
//! `pageSize` while rejecting the documented `page_size`.

const CROSS_REPO_API_SOURCES: &[(&str, &str)] = &[(
    "admin_model_command.rs",
    include_str!(
        "../../../../sdkwork-models/crates/sdkwork-models-catalog-service/src/api/admin_model_command.rs"
    ),
)];

#[test]
fn product_api_dtos_do_not_accept_duplicate_wire_field_aliases() {
    for (name, source) in product_api_sources() {
        assert!(
            !source.contains("alias ="),
            "{name} must expose one canonical wire field name per semantic; parsing aliases belong only in approved external protocol adapters"
        );
        assert!(
            !source.contains("alias="),
            "{name} must not hide duplicate wire names with compact serde alias syntax"
        );
        for (index, line) in source.replace("\r\n", "\n").lines().enumerate() {
            if let Some(suffix) = duplicate_semantic_suffix(line) {
                panic!(
                    "{name}:{} must not define duplicate semantic DTO fields with `{suffix}` suffixes",
                    index + 1
                );
            }
        }
    }
}

/// Detects a struct field whose name carries a duplicate-wire-name suffix.
///
/// The check is line- and declaration-shaped so helper functions or comments
/// that merely mention "legacy" are not treated as duplicate DTO fields.
fn duplicate_semantic_suffix(line: &str) -> Option<&'static str> {
    let line = line.trim();
    if line.is_empty() || line.starts_with("//") || line.starts_with('#') {
        return None;
    }
    let (name, _) = line.split_once(':')?;
    let name = name
        .trim()
        .strip_prefix("pub ")
        .unwrap_or(name.trim())
        .trim();
    if name.is_empty()
        || !name
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '_')
    {
        return None;
    }
    ["_camel", "_legacy", "_snake"]
        .into_iter()
        .find(|suffix| name.ends_with(suffix))
}

#[test]
fn product_api_query_dtos_do_not_use_camel_case_wire_renaming() {
    for (name, source) in product_api_sources() {
        let source = source.replace("\r\n", "\n");
        let lines: Vec<&str> = source.lines().collect();
        for (index, line) in lines.iter().enumerate() {
            if !is_camel_case_rename_attribute(line) {
                continue;
            }

            let next_struct = lines
                .iter()
                .skip(index + 1)
                .find(|candidate| !candidate.trim().is_empty());

            if let Some(struct_line) = next_struct {
                let struct_name = struct_name_from_line(struct_line);
                let is_query = struct_name.is_some_and(|candidate| {
                    candidate.ends_with("Query")
                        || candidate.ends_with("QueryRequest")
                        || source.contains(&format!("Query<{candidate}>"))
                });
                assert!(
                    !is_query,
                    "{name} must parse HTTP query DTOs with canonical URL field names such as `page_size`; \
                     generated TypeScript SDK params may expose `pageSize`, but Rust HTTP Query structs must not \
                     use serde camelCase wire renaming (offending struct: {})",
                    struct_name.unwrap_or("<unknown>")
                );
            }
        }
    }
}

#[test]
fn product_direct_http_tests_use_standard_query_names() {
    let tests_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests");
    for entry in
        std::fs::read_dir(&tests_dir).expect("sdkwork-cloudrouter-router-service tests dir exists")
    {
        let entry = entry.expect("sdkwork-cloudrouter-router-service test entry is readable");
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("rs") {
            continue;
        }
        if path.file_name().and_then(|value| value.to_str()) == Some("api_dto_alias_contract.rs") {
            continue;
        }

        let source = std::fs::read_to_string(&path)
            .expect("sdkwork-cloudrouter-router-service test is readable");
        for forbidden in [
            ("pageSize=", "page_size"),
            ("appId=", "app_id"),
            ("includeArchived=", "include_archived"),
            ("afterEventNo=", "after_event_no"),
            ("conversationId=", "conversation_id"),
            ("chatTurnId=", "chat_turn_id"),
            ("agentSessionId=", "agent_session_id"),
            ("organizationId=", "organization_id"),
            ("departmentId=", "department_id"),
            ("redirectUri=", "redirect_uri"),
            ("vendorCode=", "vendor_code"),
            ("vendorCodes=", "vendor_codes"),
            ("billingMeter=", "billing_meter"),
            ("searchQuery=", "search_query"),
            ("bindingType=", "binding_type"),
            ("channelId=", "account_id"),
            ("channelCode=", "account_code"),
            ("rankScope=", "rank_scope"),
            ("reportType=", "report_type"),
        ] {
            assert!(
                !source.contains(forbidden.0),
                "{} must use canonical direct HTTP query parameter `{}`; `{}` belongs to generated SDK method params, JSON body fields, or JSON response fields",
                path.display(),
                forbidden.1,
                forbidden.0.trim_end_matches('=')
            );
        }
    }
}

fn product_api_sources() -> Vec<(String, String)> {
    let api_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src/api");
    let mut sources = Vec::new();
    let mut entries = std::fs::read_dir(&api_dir)
        .expect("sdkwork-cloudrouter-router-service api dir exists")
        .map(|entry| entry.expect("api source entry is readable").path())
        .filter(|path| path.extension().and_then(|value| value.to_str()) == Some("rs"))
        .collect::<Vec<_>>();
    entries.sort();
    for path in entries {
        let name = path
            .file_name()
            .and_then(|value| value.to_str())
            .expect("api source file name is utf-8")
            .to_owned();
        let source = std::fs::read_to_string(&path).expect("api source is readable");
        sources.push((name, source));
    }
    for (name, source) in CROSS_REPO_API_SOURCES {
        sources.push(((*name).to_owned(), (*source).to_owned()));
    }
    sources
}

fn is_camel_case_rename_attribute(line: &str) -> bool {
    line.contains("serde(") && line.contains("rename_all") && line.contains("camelCase")
}

fn struct_name_from_line(line: &str) -> Option<&str> {
    let line = line.trim_start();
    let rest = line
        .strip_prefix("pub(crate) struct ")
        .or_else(|| line.strip_prefix("pub(super) struct "))
        .or_else(|| line.strip_prefix("pub struct "))
        .or_else(|| line.strip_prefix("struct "))?;
    rest.split(|value: char| value == '{' || value.is_whitespace() || value == '<')
        .next()
}
