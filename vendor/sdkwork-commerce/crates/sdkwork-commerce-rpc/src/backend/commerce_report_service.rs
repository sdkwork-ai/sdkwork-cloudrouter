use crate::error_mapper::map_commerce_service_error;
use crate::request_mapper::{page_request_body, retrieve_payment_reconciliation_body};
use crate::response_mapper::{
    map_list_order_revenue_response, map_list_refund_reports_response,
    map_retrieve_payment_reconciliation_response, map_usage_statements_response,
};
use crate::runtime::{extract_request_metadata, CommerceRpcOperationRuntime};
use sdkwork_commerce_rpc_proto::sdkwork::commerce::backend::v3::{
    commerce_report_service_server::CommerceReportService, ListOrderRevenueRequest,
    ListOrderRevenueResponse, ListRefundReportsRequest, ListRefundReportsResponse,
    ListUsageStatementsRequest, ListUsageStatementsResponse, RetrievePaymentReconciliationRequest,
    RetrievePaymentReconciliationResponse,
};
use tonic::{Request, Response, Status};

#[derive(Clone)]
pub struct CommerceReportServiceRpc<R> {
    runtime: R,
}

impl<R> CommerceReportServiceRpc<R> {
    pub fn new(runtime: R) -> Self {
        Self { runtime }
    }
}

#[tonic::async_trait]
impl<R> CommerceReportService for CommerceReportServiceRpc<R>
where
    R: CommerceRpcOperationRuntime,
{
    async fn list_usage_statements(
        &self,
        request: Request<ListUsageStatementsRequest>,
    ) -> Result<Response<ListUsageStatementsResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self.runtime.execute_operation_json(
            "commerceReports.usageStatements.list",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_usage_statements_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn retrieve_payment_reconciliation(
        &self,
        request: Request<RetrievePaymentReconciliationRequest>,
    ) -> Result<Response<RetrievePaymentReconciliationResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = retrieve_payment_reconciliation_body(&request.report_id);
        match self.runtime.execute_operation_json(
            "commerceReports.paymentReconciliation.retrieve",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_retrieve_payment_reconciliation_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn list_order_revenue(
        &self,
        request: Request<ListOrderRevenueRequest>,
    ) -> Result<Response<ListOrderRevenueResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self.runtime.execute_operation_json(
            "commerceReports.orderRevenue.list",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_list_order_revenue_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn list_refund_reports(
        &self,
        request: Request<ListRefundReportsRequest>,
    ) -> Result<Response<ListRefundReportsResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self.runtime.execute_operation_json(
            "commerceReports.refunds.list",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_list_refund_reports_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }
}
