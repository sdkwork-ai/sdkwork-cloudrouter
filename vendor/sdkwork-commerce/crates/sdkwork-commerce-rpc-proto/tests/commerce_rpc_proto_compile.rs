#[test]
fn commerce_rpc_proto_exports_wallet_and_checkout_messages() {
    use sdkwork_commerce_rpc_proto::sdkwork::commerce::app::v3::{
        CheckoutSession, RetrieveWalletOverviewRequest,
    };
    use sdkwork_commerce_rpc_proto::sdkwork::commerce::backend::v3::{
        ListUsageStatementsRequest, PaymentProviderAccount,
    };

    let _wallet_request = RetrieveWalletOverviewRequest {};
    let _checkout_session = CheckoutSession::default();
    let _report_request = ListUsageStatementsRequest::default();
    let _account = PaymentProviderAccount::default();
}
