use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_commerce_rpc_proto::sdkwork::commerce::app::v3::{
    CheckoutSession, ListWalletAccountsResponse, ListWalletLedgerEntriesResponse,
    RetrieveWalletOverviewResponse, WalletAccount, WalletLedgerEntry,
};
use sdkwork_commerce_rpc_proto::sdkwork::commerce::app::v3::{
    CreateCheckoutOrderResponse, CreateCheckoutQuoteResponse, CreateCheckoutSessionResponse,
    RetrieveCheckoutSessionResponse,
};
use sdkwork_commerce_rpc_proto::sdkwork::commerce::backend::v3::{
    CreatePaymentProviderAccountResponse, ListOrderRevenueResponse, ListPaymentAttemptsResponse,
    ListPaymentChannelsResponse, ListPaymentIntentsResponse, ListPaymentMethodsResponse,
    ListPaymentProviderAccountsResponse, ListPaymentReconciliationRunsResponse,
    ListRefundReportsResponse, ListUsageStatementsResponse, OrderRevenueReport, PaymentAttempt,
    PaymentChannel, PaymentIntent, PaymentMethod, PaymentProviderAccount, PaymentReconciliationRun,
    PaymentReconciliationSummary, RefundReport, RetrievePaymentReconciliationResponse,
    UsageStatement,
};
use sdkwork_commerce_rpc_proto::sdkwork::common::v1::{Money, PageResponse};
use serde_json::Value;

pub fn map_wallet_overview_response(
    body_json: &str,
) -> Result<RetrieveWalletOverviewResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    let accounts = runtime_array(&payload, &["accounts"])
        .into_iter()
        .filter_map(map_wallet_account)
        .collect();
    Ok(RetrieveWalletOverviewResponse {
        accounts,
        metadata: None,
    })
}

pub fn map_wallet_accounts_response(
    body_json: &str,
) -> Result<ListWalletAccountsResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    let accounts = runtime_array(&payload, &["accounts"])
        .into_iter()
        .filter_map(map_wallet_account)
        .collect();
    Ok(ListWalletAccountsResponse {
        accounts,
        page: map_page_response(&payload),
        metadata: None,
    })
}

pub fn map_wallet_ledger_entries_response(
    body_json: &str,
) -> Result<ListWalletLedgerEntriesResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    let entries = runtime_array(&payload, &["entries", "transactions", "ledgerEntries"])
        .into_iter()
        .filter_map(map_wallet_ledger_entry)
        .collect();
    Ok(ListWalletLedgerEntriesResponse {
        entries,
        page: map_page_response(&payload),
        metadata: None,
    })
}

pub fn map_usage_statements_response(
    body_json: &str,
) -> Result<ListUsageStatementsResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    let statements = runtime_array(&payload, &["statements", "usageStatements"])
        .into_iter()
        .filter_map(map_usage_statement)
        .collect();
    Ok(ListUsageStatementsResponse {
        statements,
        page: map_page_response(&payload),
        metadata: None,
    })
}

pub fn map_create_checkout_session_response(
    body_json: &str,
) -> Result<CreateCheckoutSessionResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    Ok(CreateCheckoutSessionResponse {
        session: map_checkout_session(&payload),
        metadata: None,
    })
}

pub fn map_retrieve_checkout_session_response(
    body_json: &str,
) -> Result<RetrieveCheckoutSessionResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    Ok(RetrieveCheckoutSessionResponse {
        session: map_checkout_session(&payload),
        metadata: None,
    })
}

pub fn map_create_checkout_quote_response(
    body_json: &str,
) -> Result<CreateCheckoutQuoteResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    Ok(CreateCheckoutQuoteResponse {
        quote_id: string_field(&payload, &["quoteId", "quote_id"]).unwrap_or_default(),
        total: map_money(
            &payload,
            &["payableAmount", "payable_amount", "total", "amount"],
            &["currencyCode", "currency_code", "currency"],
        ),
        metadata: None,
    })
}

pub fn map_create_checkout_order_response(
    body_json: &str,
) -> Result<CreateCheckoutOrderResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    Ok(CreateCheckoutOrderResponse {
        order_id: string_field(&payload, &["orderId", "order_id"]).unwrap_or_default(),
        metadata: None,
    })
}

pub fn map_list_payment_provider_accounts_response(
    body_json: &str,
) -> Result<ListPaymentProviderAccountsResponse, CommerceServiceError> {
    map_payment_admin_list_response(
        body_json,
        &["accounts", "providerAccounts"],
        map_payment_provider_account,
    )
}

pub fn map_create_payment_provider_account_response(
    body_json: &str,
) -> Result<CreatePaymentProviderAccountResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    Ok(CreatePaymentProviderAccountResponse {
        account: map_payment_provider_account(runtime_data(&payload)),
        metadata: None,
    })
}

pub fn map_list_payment_methods_response(
    body_json: &str,
) -> Result<ListPaymentMethodsResponse, CommerceServiceError> {
    map_payment_admin_list_response(
        body_json,
        &["methods", "paymentMethods"],
        map_payment_method,
    )
}

pub fn map_list_payment_channels_response(
    body_json: &str,
) -> Result<ListPaymentChannelsResponse, CommerceServiceError> {
    map_payment_admin_list_response(
        body_json,
        &["channels", "paymentChannels"],
        map_payment_channel,
    )
}

pub fn map_list_payment_intents_response(
    body_json: &str,
) -> Result<ListPaymentIntentsResponse, CommerceServiceError> {
    map_payment_admin_list_response(
        body_json,
        &["intents", "paymentIntents", "content"],
        map_payment_intent,
    )
}

pub fn map_list_payment_attempts_response(
    body_json: &str,
) -> Result<ListPaymentAttemptsResponse, CommerceServiceError> {
    map_payment_admin_list_response(
        body_json,
        &["attempts", "paymentAttempts"],
        map_payment_attempt,
    )
}

pub fn map_list_payment_reconciliation_runs_response(
    body_json: &str,
) -> Result<ListPaymentReconciliationRunsResponse, CommerceServiceError> {
    map_payment_admin_list_response(
        body_json,
        &["runs", "reconciliationRuns"],
        map_payment_reconciliation_run,
    )
}

pub fn map_retrieve_payment_reconciliation_response(
    body_json: &str,
) -> Result<RetrievePaymentReconciliationResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    let data = runtime_data(&payload);
    let reconciliation = data
        .get("reconciliation")
        .filter(|value| value.is_object())
        .unwrap_or(data);
    Ok(RetrievePaymentReconciliationResponse {
        reconciliation: Some(PaymentReconciliationSummary {
            report_id: string_field(
                reconciliation,
                &["reportId", "report_id", "id", "reconciliationRunId"],
            )
            .unwrap_or_default(),
            reconciled_amount: map_money(
                reconciliation,
                &[
                    "reconciledAmount",
                    "reconciled_amount",
                    "amount",
                    "payableAmount",
                ],
                &["currencyCode", "currency_code", "currency"],
            ),
        }),
        metadata: None,
    })
}

pub fn map_list_order_revenue_response(
    body_json: &str,
) -> Result<ListOrderRevenueResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    let reports = runtime_array(&payload, &["reports", "orderRevenue", "revenueReports"])
        .into_iter()
        .filter_map(map_order_revenue_report)
        .collect();
    Ok(ListOrderRevenueResponse {
        reports,
        page: map_page_response(&payload),
        metadata: None,
    })
}

pub fn map_list_refund_reports_response(
    body_json: &str,
) -> Result<ListRefundReportsResponse, CommerceServiceError> {
    let payload = parse_runtime_payload(body_json)?;
    let reports = runtime_array(&payload, &["reports", "refundReports", "refunds"])
        .into_iter()
        .filter_map(map_refund_report)
        .collect();
    Ok(ListRefundReportsResponse {
        reports,
        page: map_page_response(&payload),
        metadata: None,
    })
}

fn map_payment_admin_list_response<T, F>(
    body_json: &str,
    array_keys: &[&str],
    map_item: F,
) -> Result<T, CommerceServiceError>
where
    T: FromPaginatedList,
    F: Fn(&Value) -> Option<T::Item>,
{
    let payload = parse_runtime_payload(body_json)?;
    let items = runtime_array(&payload, array_keys)
        .into_iter()
        .filter_map(map_item)
        .collect();
    Ok(T::from_items(items, map_page_response(&payload)))
}

trait FromPaginatedList {
    type Item;
    fn from_items(items: Vec<Self::Item>, page: Option<PageResponse>) -> Self;
}

impl FromPaginatedList for ListPaymentProviderAccountsResponse {
    type Item = PaymentProviderAccount;
    fn from_items(accounts: Vec<Self::Item>, page: Option<PageResponse>) -> Self {
        Self {
            accounts,
            page,
            metadata: None,
        }
    }
}

impl FromPaginatedList for ListPaymentMethodsResponse {
    type Item = PaymentMethod;
    fn from_items(methods: Vec<Self::Item>, page: Option<PageResponse>) -> Self {
        Self {
            methods,
            page,
            metadata: None,
        }
    }
}

impl FromPaginatedList for ListPaymentChannelsResponse {
    type Item = PaymentChannel;
    fn from_items(channels: Vec<Self::Item>, page: Option<PageResponse>) -> Self {
        Self {
            channels,
            page,
            metadata: None,
        }
    }
}

impl FromPaginatedList for ListPaymentIntentsResponse {
    type Item = PaymentIntent;
    fn from_items(intents: Vec<Self::Item>, page: Option<PageResponse>) -> Self {
        Self {
            intents,
            page,
            metadata: None,
        }
    }
}

impl FromPaginatedList for ListPaymentAttemptsResponse {
    type Item = PaymentAttempt;
    fn from_items(attempts: Vec<Self::Item>, page: Option<PageResponse>) -> Self {
        Self {
            attempts,
            page,
            metadata: None,
        }
    }
}

impl FromPaginatedList for ListPaymentReconciliationRunsResponse {
    type Item = PaymentReconciliationRun;
    fn from_items(runs: Vec<Self::Item>, page: Option<PageResponse>) -> Self {
        Self {
            runs,
            page,
            metadata: None,
        }
    }
}

fn map_payment_provider_account(value: &Value) -> Option<PaymentProviderAccount> {
    Some(PaymentProviderAccount {
        provider_account_id: string_field(
            value,
            &["providerAccountId", "provider_account_id", "id"],
        )
        .unwrap_or_default(),
        provider_code: string_field(value, &["providerCode", "provider_code"]).unwrap_or_default(),
        status: string_field(value, &["status"]).unwrap_or_default(),
    })
}

fn map_payment_method(value: &Value) -> Option<PaymentMethod> {
    Some(PaymentMethod {
        payment_method_id: string_field(
            value,
            &[
                "paymentMethodId",
                "payment_method_id",
                "id",
                "methodKey",
                "method_key",
            ],
        )
        .unwrap_or_default(),
        code: string_field(value, &["code", "methodKey", "method_key"]).unwrap_or_default(),
    })
}

fn map_payment_channel(value: &Value) -> Option<PaymentChannel> {
    Some(PaymentChannel {
        payment_channel_id: string_field(
            value,
            &["paymentChannelId", "payment_channel_id", "id", "channelId"],
        )
        .unwrap_or_default(),
        code: string_field(value, &["code", "channelCode", "channel_code"]).unwrap_or_default(),
    })
}

fn map_payment_intent(value: &Value) -> Option<PaymentIntent> {
    Some(PaymentIntent {
        payment_intent_id: string_field(value, &["paymentIntentId", "payment_intent_id", "id"])
            .unwrap_or_default(),
        status: string_field(value, &["status"]).unwrap_or_default(),
    })
}

fn map_payment_attempt(value: &Value) -> Option<PaymentAttempt> {
    Some(PaymentAttempt {
        payment_attempt_id: string_field(value, &["paymentAttemptId", "payment_attempt_id", "id"])
            .unwrap_or_default(),
        status: string_field(value, &["status"]).unwrap_or_default(),
    })
}

fn map_payment_reconciliation_run(value: &Value) -> Option<PaymentReconciliationRun> {
    Some(PaymentReconciliationRun {
        reconciliation_run_id: string_field(
            value,
            &["reconciliationRunId", "reconciliation_run_id", "id"],
        )
        .unwrap_or_default(),
        status: string_field(value, &["status"]).unwrap_or_default(),
    })
}

fn map_order_revenue_report(value: &Value) -> Option<OrderRevenueReport> {
    Some(OrderRevenueReport {
        report_id: string_field(value, &["reportId", "report_id", "id"]).unwrap_or_default(),
        revenue: map_money(
            value,
            &["revenue", "amount", "payableAmount", "payable_amount"],
            &["currencyCode", "currency_code", "currency"],
        ),
    })
}

fn map_refund_report(value: &Value) -> Option<RefundReport> {
    Some(RefundReport {
        report_id: string_field(value, &["reportId", "report_id", "id"]).unwrap_or_default(),
        refund_amount: map_money(
            value,
            &["refundAmount", "refund_amount", "amount"],
            &["currencyCode", "currency_code", "currency"],
        ),
    })
}

fn parse_runtime_payload(body_json: &str) -> Result<Value, CommerceServiceError> {
    serde_json::from_str(body_json).map_err(|error| {
        CommerceServiceError::storage(format!("invalid runtime response json: {error}"))
    })
}

fn runtime_data(payload: &Value) -> &Value {
    payload
        .get("data")
        .filter(|value| !value.is_null())
        .unwrap_or(payload)
}

fn runtime_array<'a>(payload: &'a Value, keys: &[&str]) -> Vec<&'a Value> {
    let data = runtime_data(payload);
    if let Some(array) = data.as_array() {
        return array.iter().collect();
    }
    for key in keys {
        if let Some(array) = data.get(*key).and_then(Value::as_array) {
            return array.iter().collect();
        }
    }
    if let Some(array) = payload.as_array() {
        return array.iter().collect();
    }
    for key in keys {
        if let Some(array) = payload.get(*key).and_then(Value::as_array) {
            return array.iter().collect();
        }
    }
    Vec::new()
}

fn map_wallet_account(value: &Value) -> Option<WalletAccount> {
    let account_id = string_field(value, &["accountId", "account_id", "id"])?;
    let account_type = string_field(
        value,
        &["accountType", "account_type", "assetType", "asset_type"],
    )
    .unwrap_or_default();
    let currency = string_field(value, &["currencyCode", "currency_code", "currency"]);
    let balance = map_money(
        value,
        &["availableAmount", "available_amount", "balance", "amount"],
        &["currencyCode", "currency_code", "currency"],
    )
    .or_else(|| currency.as_ref().map(|currency| money(currency, "0")));
    Some(WalletAccount {
        account_id,
        account_type,
        balance,
    })
}

fn map_wallet_ledger_entry(value: &Value) -> Option<WalletLedgerEntry> {
    Some(WalletLedgerEntry {
        ledger_entry_id: string_field(value, &["ledgerEntryId", "ledger_entry_id", "id"])
            .unwrap_or_default(),
        account_id: string_field(value, &["accountId", "account_id"]).unwrap_or_default(),
        direction: string_field(value, &["direction"]).unwrap_or_default(),
        amount: map_money(
            value,
            &["amount"],
            &[
                "currencyCode",
                "currency_code",
                "currency",
                "assetType",
                "asset_type",
            ],
        ),
        reason: string_field(value, &["reason", "businessType", "business_type"])
            .unwrap_or_default(),
    })
}

fn map_usage_statement(value: &Value) -> Option<UsageStatement> {
    let statement_id = string_field(
        value,
        &[
            "statementId",
            "statement_id",
            "id",
            "historyNo",
            "history_no",
        ],
    )?;
    Some(UsageStatement {
        statement_id,
        account_id: string_field(value, &["accountId", "account_id"]).unwrap_or_default(),
        amount: map_money(
            value,
            &["amount", "payableAmount", "payable_amount"],
            &["currencyCode", "currency_code", "currency"],
        ),
    })
}

fn map_checkout_session(payload: &Value) -> Option<CheckoutSession> {
    let data = runtime_data(payload);
    let session = data
        .get("session")
        .filter(|value| value.is_object())
        .unwrap_or(data);
    let checkout_session_id =
        string_field(session, &["checkoutSessionId", "checkout_session_id", "id"])?;
    Some(CheckoutSession {
        checkout_session_id,
        status: string_field(session, &["status"]).unwrap_or_default(),
        total: map_money(
            session,
            &["payableAmount", "payable_amount", "total", "amount"],
            &["currencyCode", "currency_code", "currency"],
        ),
    })
}

fn map_page_response(payload: &Value) -> Option<PageResponse> {
    let page = payload
        .get("page")
        .or_else(|| runtime_data(payload).get("page"))?;
    let next_page_cursor =
        string_field(page, &["nextPageCursor", "next_page_cursor", "cursor"]).unwrap_or_default();
    let has_more = page
        .get("hasMore")
        .or_else(|| page.get("has_more"))
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let total_count = page
        .get("totalCount")
        .or_else(|| page.get("total_count"))
        .and_then(Value::as_i64)
        .unwrap_or_default();
    let total_count_exact = page
        .get("totalCountExact")
        .or_else(|| page.get("total_count_exact"))
        .and_then(Value::as_bool)
        .unwrap_or(false);
    Some(PageResponse {
        next_page_cursor,
        has_more,
        total_count,
        total_count_exact,
    })
}

fn map_money(value: &Value, amount_keys: &[&str], currency_keys: &[&str]) -> Option<Money> {
    let amount = string_field(value, amount_keys)?;
    let currency = string_field(value, currency_keys).unwrap_or_default();
    Some(money(&currency, &amount))
}

fn money(currency: &str, amount: &str) -> Money {
    Money {
        amount: amount.to_string(),
        currency: currency.to_string(),
    }
}

fn string_field(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(|field| match field {
            Value::String(text) if !text.is_empty() => Some(text.clone()),
            Value::Number(number) => Some(number.to_string()),
            Value::Bool(flag) => Some(flag.to_string()),
            _ => None,
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_wallet_overview_runtime_json() {
        let response = map_wallet_overview_response(
            r#"{
                "accounts": [
                    {
                        "id": "acct-1",
                        "assetType": "cash",
                        "currencyCode": "CNY",
                        "availableAmount": "1200"
                    }
                ]
            }"#,
        )
        .expect("overview");

        assert_eq!(response.accounts.len(), 1);
        assert_eq!(response.accounts[0].account_id, "acct-1");
        assert_eq!(response.accounts[0].account_type, "cash");
        assert_eq!(
            response.accounts[0]
                .balance
                .as_ref()
                .map(|money| money.amount.as_str()),
            Some("1200")
        );
    }

    #[test]
    fn maps_wallet_accounts_array_payload() {
        let response = map_wallet_accounts_response(
            r#"[{"id":"acct-2","assetType":"points","availableAmount":"88"}]"#,
        )
        .expect("accounts");

        assert_eq!(response.accounts.len(), 1);
        assert_eq!(response.accounts[0].account_id, "acct-2");
    }

    #[test]
    fn maps_checkout_session_runtime_json() {
        let response = map_retrieve_checkout_session_response(
            r#"{
                "checkoutSessionId": "cs-1",
                "status": "quoted",
                "payableAmount": "99.00",
                "currencyCode": "CNY"
            }"#,
        )
        .expect("checkout session");

        let session = response.session.expect("session");
        assert_eq!(session.checkout_session_id, "cs-1");
        assert_eq!(session.status, "quoted");
        assert_eq!(
            session.total.as_ref().map(|money| money.amount.as_str()),
            Some("99.00")
        );
    }
}
