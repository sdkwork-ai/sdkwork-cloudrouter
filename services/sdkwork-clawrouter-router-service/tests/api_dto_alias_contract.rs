const PRODUCT_API_SOURCES: &[(&str, &str)] = &[
    ("admin_cache.rs", include_str!("../src/api/admin_cache.rs")),
    (
        "admin_catalog.rs",
        include_str!("../src/api/admin_catalog.rs"),
    ),
    (
        "admin_finance.rs",
        include_str!("../src/api/admin_finance.rs"),
    ),
    (
        "admin_inventory.rs",
        include_str!("../src/api/admin_inventory.rs"),
    ),
    (
        "admin_marketing.rs",
        include_str!("../src/api/admin_marketing.rs"),
    ),
    ("admin_mcp.rs", include_str!("../src/api/admin_mcp.rs")),
    (
        "admin_messaging.rs",
        include_str!("../src/api/admin_messaging.rs"),
    ),
    (
        "admin_record.rs",
        include_str!("../src/api/admin_record.rs"),
    ),
    (
        "admin_model_command.rs",
        include_str!(
            "../../../../sdkwork-models/crates/sdkwork-models-catalog-service/src/api/admin_model_command.rs"
        ),
    ),
    (
        "admin_payment_runtime.rs",
        include_str!("../src/api/admin_payment_runtime.rs"),
    ),
    (
        "admin_service_provider.rs",
        include_str!("../src/api/admin_service_provider.rs"),
    ),
    (
        "admin_storage.rs",
        include_str!("../src/api/admin_storage.rs"),
    ),
    (
        "admin_transaction_center.rs",
        include_str!("../src/api/admin_transaction_center.rs"),
    ),
    ("admin_user.rs", include_str!("../src/api/admin_user.rs")),
    ("app_chat.rs", include_str!("../src/api/app_chat.rs")),
    (
        "app_notification.rs",
        include_str!("../src/api/app_notification.rs"),
    ),
    ("app_runtime.rs", include_str!("../src/api/app_runtime.rs")),
    (
        "app_settlements.rs",
        include_str!("../src/api/app_settlements.rs"),
    ),
    (
        "app_usage_logs.rs",
        include_str!("../src/api/app_usage_logs.rs"),
    ),
];

#[test]
fn product_api_dtos_do_not_accept_duplicate_wire_field_aliases() {
    for (name, source) in PRODUCT_API_SOURCES {
        assert!(
            !source.contains("alias ="),
            "{name} must expose one canonical wire field name per semantic; parsing aliases belong only in approved external protocol adapters"
        );
        assert!(
            !source.contains("alias="),
            "{name} must not hide duplicate wire names with compact serde alias syntax"
        );
        for forbidden in ["_camel", "_legacy", "_snake"] {
            assert!(
                !source.contains(forbidden),
                "{name} must not define duplicate semantic DTO fields with `{forbidden}` suffixes"
            );
        }
    }
}

#[test]
fn product_api_query_dtos_do_not_use_camel_case_wire_renaming() {
    for (name, source) in PRODUCT_API_SOURCES {
        let source = source.replace("\r\n", "\n");
        let lines: Vec<&str> = source.lines().collect();
        for (index, line) in lines.iter().enumerate() {
            if !line.contains("#[serde(rename_all = \"camelCase\")]") {
                continue;
            }

            let next_struct = lines
                .iter()
                .skip(index + 1)
                .find(|candidate| !candidate.trim().is_empty());

            if let Some(struct_line) = next_struct {
                assert!(
                    !is_query_struct_line(struct_line),
                    "{name} must parse HTTP query DTOs with canonical URL field names such as `page_size`; generated TypeScript SDK params may expose `pageSize`, but Rust HTTP Query structs must not use serde camelCase wire renaming"
                );
            }
        }
    }
}

#[test]
fn product_direct_http_tests_use_standard_query_names() {
    let tests_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests");
    for entry in
        std::fs::read_dir(&tests_dir).expect("sdkwork-clawrouter-router-service tests dir exists")
    {
        let entry = entry.expect("sdkwork-clawrouter-router-service test entry is readable");
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("rs") {
            continue;
        }
        if path.file_name().and_then(|value| value.to_str()) == Some("api_dto_alias_contract.rs") {
            continue;
        }

        let source = std::fs::read_to_string(&path)
            .expect("sdkwork-clawrouter-router-service test is readable");
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

fn is_query_struct_line(line: &str) -> bool {
    let line = line.trim_start();
    let Some(struct_name) = line
        .strip_prefix("struct ")
        .or_else(|| line.strip_prefix("pub struct "))
        .or_else(|| line.strip_prefix("pub(crate) struct "))
        .or_else(|| line.strip_prefix("pub(super) struct "))
    else {
        return false;
    };

    struct_name
        .split(|value: char| value == '{' || value.is_whitespace())
        .next()
        .is_some_and(|name| name.ends_with("Query"))
}
