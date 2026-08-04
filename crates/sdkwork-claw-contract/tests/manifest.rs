use sdkwork_claw_contract::{matches_path_pattern, ApiSurface, ContractManifest};

#[test]
fn embedded_manifest_finds_exact_app_operation() {
    let manifest = ContractManifest::from_embedded().unwrap();

    let operation = manifest
        .find_operation(ApiSurface::App, "GET", "/app/v3/api/iam/users/current")
        .unwrap();

    assert_eq!("fetchCurrentUser", operation.operation);
    assert_eq!("GET", operation.method);
    assert_eq!("/app/v3/api/iam/users/current", operation.path);
    assert_eq!(ApiSurface::App, operation.surface);
}

#[test]
fn embedded_manifest_exposes_sdk_domain_for_runtime_contract_filters() {
    let manifest = ContractManifest::from_embedded().unwrap();

    let operation = manifest
        .find_operation(ApiSurface::App, "GET", "/app/v3/api/notification/notifications")
        .unwrap();

    assert_eq!(Some("notification"), operation.sdk_domain.as_deref());
}

#[test]
fn embedded_manifest_finds_backend_operation_with_path_parameter() {
    let manifest = ContractManifest::from_embedded().unwrap();

    let operation = manifest
        .find_operation(
            ApiSurface::Backend,
            "PATCH",
            "/backend/v3/api/ai/upstream_accounts/account-001",
        )
        .unwrap();

    assert_eq!("updateUpstreamAccount", operation.operation);
    assert_eq!(
        "/backend/v3/api/ai/upstream_accounts/{accountId}",
        operation.path
    );
    assert_eq!(ApiSurface::Backend, operation.surface);
}

#[test]
fn embedded_manifest_rejects_unknown_path_or_wrong_surface() {
    let manifest = ContractManifest::from_embedded().unwrap();

    assert!(manifest
        .find_operation(ApiSurface::App, "GET", "/app/v3/api/not-in-contract")
        .is_none());
    assert!(manifest
        .find_operation(ApiSurface::Backend, "GET", "/app/v3/api/iam/users/current")
        .is_none());
}

#[test]
fn path_pattern_matches_only_equal_segment_shapes() {
    assert!(matches_path_pattern(
        "/backend/v3/api/content/announcements/{announcementId}",
        "/backend/v3/api/content/announcements/notice-001",
    ));
    assert!(!matches_path_pattern(
        "/backend/v3/api/content/announcements/{announcementId}",
        "/backend/v3/api/content/announcements/notice-001/extra",
    ));
    assert!(!matches_path_pattern(
        "/backend/v3/api/content/announcements/{announcementId}",
        "/backend/v3/api/router/models/notice-001",
    ));
}
