use sdkwork_clawrouter_router_service::application::{
    InMemoryPaymentProviderRuntimeSnapshotStore, PaymentProviderRuntimeAssemblyFailure,
    PaymentProviderRuntimeAssemblyReport, PaymentProviderRuntimeAssemblySkipped,
    PaymentProviderRuntimeAssemblySuccess, PaymentProviderRuntimeSnapshotService,
};

#[tokio::test]
async fn runtime_snapshot_service_stores_latest_payment_provider_assembly_report() {
    let store = InMemoryPaymentProviderRuntimeSnapshotStore::default();
    let service = PaymentProviderRuntimeSnapshotService::new(store.clone());
    let report = assembly_report();

    let snapshot = service
        .record_report("sandbox", "2026-05-30T09:00:00Z", &report)
        .await;

    assert_eq!("sandbox", snapshot.environment);
    assert_eq!("2026-05-30T09:00:00Z", snapshot.recorded_at);
    assert_eq!(3, snapshot.summary.total);
    assert_eq!(1, snapshot.summary.registered);
    assert_eq!(1, snapshot.summary.failed);
    assert_eq!(1, snapshot.summary.skipped);
    assert_eq!(3, snapshot.events.len());

    let latest = service
        .load_latest("sandbox")
        .await
        .expect("snapshot should be stored");
    assert_eq!(snapshot, latest);
}

#[tokio::test]
async fn runtime_snapshot_service_keeps_environment_snapshots_isolated() {
    let store = InMemoryPaymentProviderRuntimeSnapshotStore::default();
    let service = PaymentProviderRuntimeSnapshotService::new(store);

    service
        .record_report("sandbox", "2026-05-30T09:00:00Z", &assembly_report())
        .await;
    service
        .record_report("production", "2026-05-30T09:01:00Z", &assembly_report())
        .await;

    let sandbox = service.load_latest("sandbox").await.unwrap();
    let production = service.load_latest("production").await.unwrap();

    assert_eq!("sandbox", sandbox.environment);
    assert_eq!("production", production.environment);
    assert_eq!("2026-05-30T09:00:00Z", sandbox.recorded_at);
    assert_eq!("2026-05-30T09:01:00Z", production.recorded_at);
}

#[tokio::test]
async fn runtime_snapshot_diagnostics_do_not_expose_secret_material() {
    let store = InMemoryPaymentProviderRuntimeSnapshotStore::default();
    let service = PaymentProviderRuntimeSnapshotService::new(store);
    let mut report = assembly_report();
    report.failures[0].message =
        "payment provider request is invalid: paypal/Capabilities: secretRef must start with vault:// or secret://".to_owned();

    let snapshot = service
        .record_report("sandbox", "2026-05-30T09:00:00Z", &report)
        .await;
    let diagnostic = serde_json::to_string(&snapshot).unwrap();

    assert!(!diagnostic.contains("secret://"));
    assert!(!diagnostic.contains("sk_live"));
    assert!(!diagnostic.contains("paypal-plaintext-secret"));
}

fn assembly_report() -> PaymentProviderRuntimeAssemblyReport {
    PaymentProviderRuntimeAssemblyReport::from_parts(
        vec![PaymentProviderRuntimeAssemblySuccess {
            account_no: "stripe-main".to_owned(),
            provider_code: "stripe".to_owned(),
        }],
        vec![PaymentProviderRuntimeAssemblyFailure {
            account_no: "paypal-bad-secret".to_owned(),
            provider_code: "paypal".to_owned(),
            message: "secretRef must start with vault:// or secret://".to_owned(),
        }],
        vec![PaymentProviderRuntimeAssemblySkipped {
            account_no: "wechat-disabled".to_owned(),
            provider_code: "wechat_pay".to_owned(),
            reason: "disabled".to_owned(),
        }],
    )
}
