use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_commerce_rpc::error_mapper::map_commerce_service_error;
use sdkwork_rpc_core::map_error_kind_to_code;
use tonic::Code;

#[test]
fn commerce_rpc_error_mapper_maps_service_errors_to_tonic_codes() {
    let status = map_commerce_service_error(CommerceServiceError::not_found("wallet account"));
    assert_eq!(status.code(), Code::NotFound);

    let status = map_commerce_service_error(CommerceServiceError::validation("amount"));
    assert_eq!(status.code(), Code::InvalidArgument);

    let status = map_commerce_service_error(CommerceServiceError::unauthorized("forbidden"));
    assert_eq!(status.code(), Code::PermissionDenied);
}

#[test]
fn commerce_rpc_error_mapper_uses_sdkwork_rpc_core_code_table() {
    let status = map_commerce_service_error(CommerceServiceError::provider_unavailable("wechat"));
    assert_eq!(
        status.code(),
        map_error_kind_to_code(sdkwork_rpc_core::SdkworkRpcErrorKind::ProviderUnavailable)
    );
}

#[tokio::test]
async fn commerce_rpc_wallet_service_roundtrip_smoke_test() {
    use sdkwork_commerce_rpc::{
        commerce_rpc_server_builder, CommerceRpcNoopRuntime, CommerceRpcServerConfig,
        CommerceRpcServices,
    };
    use sdkwork_commerce_rpc_proto::sdkwork::commerce::app::v3::{
        wallet_service_client::WalletServiceClient, RetrieveWalletOverviewRequest,
    };
    use tokio_stream::wrappers::TcpListenerStream;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind");
    let addr = listener.local_addr().expect("local addr");
    let router = commerce_rpc_server_builder(CommerceRpcServerConfig {
        bind_addr: addr.to_string(),
        enforce_auth_metadata: false,
        ..CommerceRpcServerConfig::default()
    })
    .router(CommerceRpcServices {
        runtime: CommerceRpcNoopRuntime,
    });

    tokio::spawn(async move {
        router
            .serve_with_incoming(TcpListenerStream::new(listener))
            .await
            .expect("serve");
    });

    let mut client = WalletServiceClient::connect(format!("http://{addr}"))
        .await
        .expect("connect");
    let response = client
        .retrieve_wallet_overview(RetrieveWalletOverviewRequest {})
        .await
        .expect("rpc")
        .into_inner();

    assert!(response.accounts.is_empty());
}

#[tokio::test]
async fn commerce_rpc_backend_report_service_roundtrip_smoke_test() {
    use sdkwork_commerce_rpc::{
        commerce_rpc_server_builder, CommerceRpcNoopRuntime, CommerceRpcServerConfig,
        CommerceRpcServices,
    };
    use sdkwork_commerce_rpc_proto::sdkwork::commerce::backend::v3::{
        commerce_report_service_client::CommerceReportServiceClient, ListUsageStatementsRequest,
    };
    use tokio_stream::wrappers::TcpListenerStream;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind");
    let addr = listener.local_addr().expect("local addr");
    let router = commerce_rpc_server_builder(CommerceRpcServerConfig {
        enforce_auth_metadata: false,
        ..CommerceRpcServerConfig::default()
    })
    .router(CommerceRpcServices {
        runtime: CommerceRpcNoopRuntime,
    });

    tokio::spawn(async move {
        router
            .serve_with_incoming(TcpListenerStream::new(listener))
            .await
            .expect("serve");
    });

    let mut client = CommerceReportServiceClient::connect(format!("http://{addr}"))
        .await
        .expect("connect");
    let response = client
        .list_usage_statements(ListUsageStatementsRequest::default())
        .await
        .expect("rpc")
        .into_inner();

    assert!(response.statements.is_empty());
}

#[tokio::test]
async fn commerce_rpc_server_registers_health_and_reflection_when_enabled() {
    use sdkwork_commerce_rpc::{
        commerce_rpc_server_builder, mark_commerce_rpc_health_serving, CommerceRpcNoopRuntime,
        CommerceRpcServerConfig, CommerceRpcServices,
    };

    let (mut health_reporter, _health_service) = tonic_health::server::health_reporter();
    mark_commerce_rpc_health_serving(&mut health_reporter).await;

    let router = commerce_rpc_server_builder(CommerceRpcServerConfig {
        enable_health: true,
        enable_reflection: true,
        enforce_auth_metadata: false,
        ..CommerceRpcServerConfig::default()
    })
    .router(CommerceRpcServices {
        runtime: CommerceRpcNoopRuntime,
    });

    let _ = router;
}

#[test]
fn commerce_rpc_server_does_not_depend_on_http_or_tauri_adapters() {
    let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("Cargo.toml");
    let source = std::fs::read_to_string(manifest).expect("read Cargo.toml");
    assert!(!source.contains("sdkwork-commerce-api-server"));
    assert!(!source.contains("sdkwork-commerce-tauri-host"));
}
