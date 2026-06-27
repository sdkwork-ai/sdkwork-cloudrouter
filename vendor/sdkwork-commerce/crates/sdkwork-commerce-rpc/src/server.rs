use crate::app::{checkout_service::CheckoutServiceRpc, wallet_service::WalletServiceRpc};
use crate::backend::{
    commerce_report_service::CommerceReportServiceRpc,
    payment_admin_service::PaymentAdminServiceRpc,
};
use crate::interceptor::commerce_rpc_request_interceptor;
use crate::runtime::{CommerceRpcOperationRuntime, ValidatedCommerceRpcRuntime};
use sdkwork_commerce_rpc_proto::sdkwork::commerce::app::v3::{
    checkout_service_server::CheckoutServiceServer, wallet_service_server::WalletServiceServer,
};
use sdkwork_commerce_rpc_proto::sdkwork::commerce::backend::v3::{
    commerce_report_service_server::CommerceReportServiceServer,
    payment_admin_service_server::PaymentAdminServiceServer,
};
use tokio_stream::wrappers::TcpListenerStream;
use tonic::transport::server::Router;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRpcServerConfig {
    pub bind_addr: String,
    pub enable_health: bool,
    pub enable_reflection: bool,
    pub require_tls: bool,
    pub enforce_auth_metadata: bool,
}

impl Default for CommerceRpcServerConfig {
    fn default() -> Self {
        Self {
            bind_addr: "127.0.0.1:50051".to_string(),
            enable_health: true,
            enable_reflection: false,
            require_tls: false,
            enforce_auth_metadata: true,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRpcServices<R> {
    pub runtime: R,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct CommerceRpcServerBuilder {
    pub config: CommerceRpcServerConfig,
}

pub struct CommerceRpcServerHandle {
    pub router: Router,
    pub health_reporter: Option<tonic_health::server::HealthReporter>,
}

impl CommerceRpcServerBuilder {
    pub fn new(config: CommerceRpcServerConfig) -> Self {
        Self { config }
    }

    pub fn build<R>(&self, services: CommerceRpcServices<R>) -> CommerceRpcServerHandle
    where
        R: CommerceRpcOperationRuntime,
    {
        let runtime = ValidatedCommerceRpcRuntime::new(services.runtime)
            .with_auth_enforcement(self.config.enforce_auth_metadata);

        let mut router = tonic::transport::Server::builder()
            .add_service(WalletServiceServer::with_interceptor(
                WalletServiceRpc::new(runtime.clone()),
                commerce_rpc_request_interceptor,
            ))
            .add_service(CheckoutServiceServer::with_interceptor(
                CheckoutServiceRpc::new(runtime.clone()),
                commerce_rpc_request_interceptor,
            ))
            .add_service(PaymentAdminServiceServer::with_interceptor(
                PaymentAdminServiceRpc::new(runtime.clone()),
                commerce_rpc_request_interceptor,
            ))
            .add_service(CommerceReportServiceServer::with_interceptor(
                CommerceReportServiceRpc::new(runtime),
                commerce_rpc_request_interceptor,
            ));

        let mut health_reporter = None;
        if self.config.enable_health {
            let (reporter, health_service) = tonic_health::server::health_reporter();
            router = router.add_service(health_service);
            health_reporter = Some(reporter);
        }

        if self.config.enable_reflection {
            let reflection = tonic_reflection::server::Builder::configure()
                .register_encoded_file_descriptor_set(
                    sdkwork_commerce_rpc_proto::FILE_DESCRIPTOR_SET,
                )
                .build_v1()
                .expect("commerce rpc reflection descriptor set must compile");
            router = router.add_service(reflection);
        }

        CommerceRpcServerHandle {
            router,
            health_reporter,
        }
    }

    pub fn router<R>(&self, services: CommerceRpcServices<R>) -> Router
    where
        R: CommerceRpcOperationRuntime,
    {
        self.build(services).router
    }
}

pub fn commerce_rpc_server_builder(config: CommerceRpcServerConfig) -> CommerceRpcServerBuilder {
    CommerceRpcServerBuilder::new(config)
}

pub async fn mark_commerce_rpc_health_serving(
    health_reporter: &mut tonic_health::server::HealthReporter,
) {
    health_reporter
        .set_service_status("", tonic_health::ServingStatus::Serving)
        .await;
}

pub async fn serve_commerce_rpc_server(
    config: &CommerceRpcServerConfig,
    mut handle: CommerceRpcServerHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if let Some(reporter) = handle.health_reporter.as_mut() {
        mark_commerce_rpc_health_serving(reporter).await;
    }

    let listener = tokio::net::TcpListener::bind(&config.bind_addr).await?;
    handle
        .router
        .serve_with_incoming_shutdown(TcpListenerStream::new(listener), async {
            tokio::signal::ctrl_c().await.ok();
        })
        .await?;
    Ok(())
}
