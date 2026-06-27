use sdkwork_commerce_rpc_proto::sdkwork::commerce::app::v3::CheckoutItem;
use sdkwork_commerce_rpc_proto::sdkwork::common::v1::PageRequest;
use serde_json::{json, Map, Value};

pub fn empty_request_body() -> String {
    "{}".to_string()
}

pub fn page_request_body(page: Option<&PageRequest>) -> String {
    match page {
        Some(page) => {
            serde_json::to_string(&page_request_value(page)).unwrap_or_else(|_| "{}".to_string())
        }
        None => empty_request_body(),
    }
}

pub fn wallet_ledger_entries_request_body(account_id: &str, page: Option<&PageRequest>) -> String {
    let mut body = Map::new();
    if !account_id.is_empty() {
        body.insert(
            "accountId".to_string(),
            Value::String(account_id.to_string()),
        );
    }
    merge_page_request(&mut body, page);
    serde_json::to_string(&Value::Object(body)).unwrap_or_else(|_| "{}".to_string())
}

pub fn create_checkout_session_body(items: &[CheckoutItem]) -> String {
    let lines = items
        .iter()
        .map(|item| {
            json!({
                "skuId": item.sku_id,
                "quantity": item.quantity,
            })
        })
        .collect::<Vec<_>>();
    serde_json::to_string(&json!({ "lines": lines })).unwrap_or_else(|_| "{}".to_string())
}

pub fn retrieve_checkout_session_body(checkout_session_id: &str) -> String {
    serde_json::to_string(&json!({
        "checkoutSessionId": checkout_session_id,
    }))
    .unwrap_or_else(|_| "{}".to_string())
}

pub fn create_checkout_quote_body(checkout_session_id: &str) -> String {
    retrieve_checkout_session_body(checkout_session_id)
}

pub fn create_checkout_order_body(checkout_session_id: &str, quote_id: &str) -> String {
    serde_json::to_string(&json!({
        "checkoutSessionId": checkout_session_id,
        "quoteId": quote_id,
    }))
    .unwrap_or_else(|_| "{}".to_string())
}

pub fn create_payment_provider_account_body(provider_code: &str, display_name: &str) -> String {
    serde_json::to_string(&json!({
        "providerCode": provider_code,
        "displayName": display_name,
    }))
    .unwrap_or_else(|_| "{}".to_string())
}

pub fn retrieve_payment_reconciliation_body(report_id: &str) -> String {
    serde_json::to_string(&json!({
        "reportId": report_id,
    }))
    .unwrap_or_else(|_| "{}".to_string())
}

fn page_request_value(page: &PageRequest) -> Value {
    let mut body = Map::new();
    if page.page_size > 0 {
        body.insert("pageSize".to_string(), json!(page.page_size));
    }
    if !page.page_cursor.is_empty() {
        body.insert(
            "cursor".to_string(),
            Value::String(page.page_cursor.clone()),
        );
    }
    if !page.sort.is_empty() {
        body.insert("sort".to_string(), Value::String(page.sort.clone()));
    }
    if !page.filters.is_empty() {
        body.insert(
            "filters".to_string(),
            Value::Object(
                page.filters
                    .clone()
                    .into_iter()
                    .map(|(key, value)| (key, Value::String(value)))
                    .collect(),
            ),
        );
    }
    Value::Object(body)
}

fn merge_page_request(body: &mut Map<String, Value>, page: Option<&PageRequest>) {
    let Some(page) = page else {
        return;
    };
    let page_value = page_request_value(page);
    let Some(page_object) = page_value.as_object() else {
        return;
    };
    for (key, value) in page_object {
        body.insert(key.clone(), value.clone());
    }
}
