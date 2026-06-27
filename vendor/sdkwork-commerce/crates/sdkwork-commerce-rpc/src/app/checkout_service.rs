use crate::error_mapper::map_commerce_service_error;
use crate::request_mapper::{
    create_checkout_order_body, create_checkout_quote_body, create_checkout_session_body,
    retrieve_checkout_session_body,
};
use crate::response_mapper::{
    map_create_checkout_order_response, map_create_checkout_quote_response,
    map_create_checkout_session_response, map_retrieve_checkout_session_response,
};
use crate::runtime::{extract_request_metadata, CommerceRpcOperationRuntime};
use sdkwork_commerce_rpc_proto::sdkwork::commerce::app::v3::{
    checkout_service_server::CheckoutService, CreateCheckoutOrderRequest,
    CreateCheckoutOrderResponse, CreateCheckoutQuoteRequest, CreateCheckoutQuoteResponse,
    CreateCheckoutSessionRequest, CreateCheckoutSessionResponse, RetrieveCheckoutSessionRequest,
    RetrieveCheckoutSessionResponse,
};
use tonic::{Request, Response, Status};

#[derive(Clone)]
pub struct CheckoutServiceRpc<R> {
    runtime: R,
}

impl<R> CheckoutServiceRpc<R> {
    pub fn new(runtime: R) -> Self {
        Self { runtime }
    }
}

#[tonic::async_trait]
impl<R> CheckoutService for CheckoutServiceRpc<R>
where
    R: CommerceRpcOperationRuntime,
{
    async fn create_checkout_session(
        &self,
        request: Request<CreateCheckoutSessionRequest>,
    ) -> Result<Response<CreateCheckoutSessionResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = create_checkout_session_body(&request.items);
        match self
            .runtime
            .execute_operation_json("checkout.sessions.create", &body_json, &metadata)
        {
            Ok(body_json) => map_create_checkout_session_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn retrieve_checkout_session(
        &self,
        request: Request<RetrieveCheckoutSessionRequest>,
    ) -> Result<Response<RetrieveCheckoutSessionResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = retrieve_checkout_session_body(&request.checkout_session_id);
        match self.runtime.execute_operation_json(
            "checkout.sessions.retrieve",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_retrieve_checkout_session_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn create_checkout_quote(
        &self,
        request: Request<CreateCheckoutQuoteRequest>,
    ) -> Result<Response<CreateCheckoutQuoteResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = create_checkout_quote_body(&request.checkout_session_id);
        match self.runtime.execute_operation_json(
            "checkout.sessions.quotes.create",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_create_checkout_quote_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn create_checkout_order(
        &self,
        request: Request<CreateCheckoutOrderRequest>,
    ) -> Result<Response<CreateCheckoutOrderResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = create_checkout_order_body(&request.checkout_session_id, &request.quote_id);
        match self.runtime.execute_operation_json(
            "checkout.sessions.orders.create",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_create_checkout_order_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }
}
