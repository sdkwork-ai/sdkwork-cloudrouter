use crate::error_mapper::map_commerce_service_error;
use crate::request_mapper::{create_payment_provider_account_body, page_request_body};
use crate::response_mapper::{
    map_create_payment_provider_account_response, map_list_payment_attempts_response,
    map_list_payment_channels_response, map_list_payment_intents_response,
    map_list_payment_methods_response, map_list_payment_provider_accounts_response,
    map_list_payment_reconciliation_runs_response,
};
use crate::runtime::{extract_request_metadata, CommerceRpcOperationRuntime};
use sdkwork_commerce_rpc_proto::sdkwork::commerce::backend::v3::{
    payment_admin_service_server::PaymentAdminService, CreatePaymentProviderAccountRequest,
    CreatePaymentProviderAccountResponse, ListPaymentAttemptsRequest, ListPaymentAttemptsResponse,
    ListPaymentChannelsRequest, ListPaymentChannelsResponse, ListPaymentIntentsRequest,
    ListPaymentIntentsResponse, ListPaymentMethodsRequest, ListPaymentMethodsResponse,
    ListPaymentProviderAccountsRequest, ListPaymentProviderAccountsResponse,
    ListPaymentReconciliationRunsRequest, ListPaymentReconciliationRunsResponse,
};
use tonic::{Request, Response, Status};

#[derive(Clone)]
pub struct PaymentAdminServiceRpc<R> {
    runtime: R,
}

impl<R> PaymentAdminServiceRpc<R> {
    pub fn new(runtime: R) -> Self {
        Self { runtime }
    }
}

#[tonic::async_trait]
impl<R> PaymentAdminService for PaymentAdminServiceRpc<R>
where
    R: CommerceRpcOperationRuntime,
{
    async fn list_payment_provider_accounts(
        &self,
        request: Request<ListPaymentProviderAccountsRequest>,
    ) -> Result<Response<ListPaymentProviderAccountsResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self.runtime.execute_operation_json(
            "payments.providerAccounts.list",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_list_payment_provider_accounts_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn create_payment_provider_account(
        &self,
        request: Request<CreatePaymentProviderAccountRequest>,
    ) -> Result<Response<CreatePaymentProviderAccountResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json =
            create_payment_provider_account_body(&request.provider_code, &request.display_name);
        match self.runtime.execute_operation_json(
            "payments.providerAccounts.create",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_create_payment_provider_account_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn list_payment_methods(
        &self,
        request: Request<ListPaymentMethodsRequest>,
    ) -> Result<Response<ListPaymentMethodsResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self.runtime.execute_operation_json(
            "payments.methods.management.list",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_list_payment_methods_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn list_payment_channels(
        &self,
        request: Request<ListPaymentChannelsRequest>,
    ) -> Result<Response<ListPaymentChannelsResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self
            .runtime
            .execute_operation_json("payments.channels.list", &body_json, &metadata)
        {
            Ok(body_json) => map_list_payment_channels_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn list_payment_intents(
        &self,
        request: Request<ListPaymentIntentsRequest>,
    ) -> Result<Response<ListPaymentIntentsResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self
            .runtime
            .execute_operation_json("payments.intents.list", &body_json, &metadata)
        {
            Ok(body_json) => map_list_payment_intents_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn list_payment_attempts(
        &self,
        request: Request<ListPaymentAttemptsRequest>,
    ) -> Result<Response<ListPaymentAttemptsResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self
            .runtime
            .execute_operation_json("payments.attempts.list", &body_json, &metadata)
        {
            Ok(body_json) => map_list_payment_attempts_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn list_payment_reconciliation_runs(
        &self,
        request: Request<ListPaymentReconciliationRunsRequest>,
    ) -> Result<Response<ListPaymentReconciliationRunsResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self.runtime.execute_operation_json(
            "payments.reconciliationRuns.list",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_list_payment_reconciliation_runs_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }
}
