use sdkwork_claw_http::{ensure_row_tenant_matches, record_tenant_isolation_violation};

#[test]
fn ensure_row_tenant_matches_accepts_matching_scope() {
    ensure_row_tenant_matches("ai_usage", "test", 100_001, 100_001).expect("matching tenant");
}

#[test]
fn ensure_row_tenant_matches_records_violation_for_cross_tenant_rows() {
    let error = ensure_row_tenant_matches("ai_usage", "test", 100_001, 100_002)
        .expect_err("cross tenant must fail");
    assert!(error.to_string().contains("tenant isolation violation"));
    record_tenant_isolation_violation("ai_usage", "test", 100_001, 100_003);
}
