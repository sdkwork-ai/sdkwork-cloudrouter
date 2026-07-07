#[test]
fn app_api_direct_http_tests_use_standard_query_names() {
    let tests_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests");
    for entry in std::fs::read_dir(&tests_dir)
        .expect("sdkwork-clawrouter-standalone-gateway tests dir exists")
    {
        let entry = entry.expect("sdkwork-clawrouter-standalone-gateway test entry is readable");
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("rs") {
            continue;
        }
        if path.file_name().and_then(|value| value.to_str()) == Some("api_query_contract.rs") {
            continue;
        }

        let source = std::fs::read_to_string(&path)
            .expect("sdkwork-clawrouter-standalone-gateway test is readable");
        for forbidden in [
            ("pageSize=", "page_size"),
            ("redirectUri=", "redirect_uri"),
            ("rankScope=", "rank_scope"),
            ("reportType=", "report_type"),
            ("sessionId=", "session_id"),
            ("appId=", "app_id"),
            ("organizationId=", "organization_id"),
            ("departmentId=", "department_id"),
            ("vendorCode=", "vendor_code"),
            ("vendorCodes=", "vendor_codes"),
            ("billingMeter=", "billing_meter"),
            ("searchQuery=", "search_query"),
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
