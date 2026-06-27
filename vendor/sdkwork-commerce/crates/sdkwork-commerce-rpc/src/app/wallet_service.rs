use crate::error_mapper::map_commerce_service_error;
use crate::request_mapper::{
    empty_request_body, page_request_body, wallet_ledger_entries_request_body,
};
use crate::response_mapper::{
    map_wallet_accounts_response, map_wallet_ledger_entries_response, map_wallet_overview_response,
};
use crate::runtime::{extract_request_metadata, CommerceRpcOperationRuntime};
use sdkwork_commerce_rpc_proto::sdkwork::commerce::app::v3::{
    wallet_service_server::WalletService, ListWalletAccountsRequest, ListWalletAccountsResponse,
    ListWalletLedgerEntriesRequest, ListWalletLedgerEntriesResponse, RetrieveWalletOverviewRequest,
    RetrieveWalletOverviewResponse,
};
use tonic::{Request, Response, Status};

#[derive(Clone)]
pub struct WalletServiceRpc<R> {
    runtime: R,
}

impl<R> WalletServiceRpc<R> {
    pub fn new(runtime: R) -> Self {
        Self { runtime }
    }
}

#[tonic::async_trait]
impl<R> WalletService for WalletServiceRpc<R>
where
    R: CommerceRpcOperationRuntime,
{
    async fn retrieve_wallet_overview(
        &self,
        request: Request<RetrieveWalletOverviewRequest>,
    ) -> Result<Response<RetrieveWalletOverviewResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let _request = request.into_inner();
        match self.runtime.execute_operation_json(
            "wallet.overview.retrieve",
            &empty_request_body(),
            &metadata,
        ) {
            Ok(body_json) => map_wallet_overview_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn list_wallet_accounts(
        &self,
        request: Request<ListWalletAccountsRequest>,
    ) -> Result<Response<ListWalletAccountsResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json = page_request_body(request.page.as_ref());
        match self
            .runtime
            .execute_operation_json("wallet.accounts.list", &body_json, &metadata)
        {
            Ok(body_json) => map_wallet_accounts_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }

    async fn list_wallet_ledger_entries(
        &self,
        request: Request<ListWalletLedgerEntriesRequest>,
    ) -> Result<Response<ListWalletLedgerEntriesResponse>, Status> {
        let metadata = extract_request_metadata(request.metadata());
        let request = request.into_inner();
        let body_json =
            wallet_ledger_entries_request_body(&request.account_id, request.page.as_ref());
        match self.runtime.execute_operation_json(
            "wallet.ledgerEntries.list",
            &body_json,
            &metadata,
        ) {
            Ok(body_json) => map_wallet_ledger_entries_response(&body_json)
                .map(Response::new)
                .map_err(map_commerce_service_error),
            Err(error) => Err(map_commerce_service_error(error)),
        }
    }
}
