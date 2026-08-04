use std::sync::Arc;

use crate::api::paths::app_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{AfterSalesEventsListResult, AfterSalesRequestsCreateResult, AfterSalesRequestsListResult, AfterSalesRequestsRetrieveResult, AfterSalesRequestsUpdateResult, AfterSalesReturnShipmentsCreateResult, AfterSalesReturnShipmentsListResult, ShopsCurrentApplicationsCreateResult, ShopsCurrentApplicationsListResult, ShopsCurrentBrandAuthorizationsListResult, ShopsCurrentBrandAuthorizationsUpsertResult, ShopsCurrentBusinessHoursRetrieveResult, ShopsCurrentBusinessHoursUpdateResult, ShopsCurrentCategoryBindingsListResult, ShopsCurrentCategoryBindingsUpsertResult, ShopsCurrentChannelsListResult, ShopsCurrentChannelsUpdateResult, ShopsCurrentCustomerServicesListResult, ShopsCurrentCustomerServicesUpsertResult, ShopsCurrentDashboardRetrieveResult, ShopsCurrentDepositAccountRetrieveResult, ShopsCurrentFulfillmentProfileRetrieveResult, ShopsCurrentFulfillmentProfileUpdateResult, ShopsCurrentInventoryStocksAdjustmentsCreateResult, ShopsCurrentInventoryStocksListResult, ShopsCurrentOrdersFulfillmentsCreateResult, ShopsCurrentOrdersListResult, ShopsCurrentOrdersRetrieveResult, ShopsCurrentPoliciesListResult, ShopsCurrentPoliciesUpdateResult, ShopsCurrentProductsCreateResult, ShopsCurrentProductsListResult, ShopsCurrentProductsPublishResult, ShopsCurrentProductsUnpublishResult, ShopsCurrentProductsUpdateResult, ShopsCurrentQualificationsListResult, ShopsCurrentQualificationsUpsertResult, ShopsCurrentReadinessRetrieveResult, ShopsCurrentRetrieveResult, ShopsCurrentReturnAddressesListResult, ShopsCurrentReturnAddressesUpsertResult, ShopsCurrentRiskSignalsListResult, ShopsCurrentServiceAreasCreateResult, ShopsCurrentServiceAreasListResult, ShopsCurrentServiceAreasUpdateResult, ShopsCurrentSettlementProfileRetrieveResult, ShopsCurrentSettlementProfileUpdateResult, ShopsCurrentSettlementsListResult, ShopsCurrentShippingTemplatesListResult, ShopsCurrentShippingTemplatesUpsertResult, ShopsCurrentStatusEventsListResult, ShopsCurrentVerificationsListResult, ShopsListResult, ShopsRetrieveResult, SiteRuntimeRetrieveResult};

#[derive(Clone)]
pub struct SystemApi {
    client: Arc<SdkworkHttpClient>,
}

impl SystemApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// List
    pub async fn after_sales_requests_list(&self) -> Result<AfterSalesRequestsListResult, SdkworkError> {
        let path = app_path(&"/after_sales/requests".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn after_sales_requests_retrieve(&self, after_sales_request_id: &str) -> Result<AfterSalesRequestsRetrieveResult, SdkworkError> {
        let path = app_path(&format!("/after_sales/requests/{}", serialize_path_parameter(after_sales_request_id, PathParameterSpec::new("afterSalesRequestId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn after_sales_events_list(&self, after_sales_request_id: &str) -> Result<AfterSalesEventsListResult, SdkworkError> {
        let path = app_path(&format!("/after_sales/requests/{}/events", serialize_path_parameter(after_sales_request_id, PathParameterSpec::new("afterSalesRequestId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn after_sales_return_shipments_list(&self, after_sales_request_id: &str) -> Result<AfterSalesReturnShipmentsListResult, SdkworkError> {
        let path = app_path(&format!("/after_sales/requests/{}/return_shipments", serialize_path_parameter(after_sales_request_id, PathParameterSpec::new("afterSalesRequestId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_list(&self) -> Result<ShopsListResult, SdkworkError> {
        let path = app_path(&"/shops".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn shops_current_retrieve(&self) -> Result<ShopsCurrentRetrieveResult, SdkworkError> {
        let path = app_path(&"/shops/current".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_applications_list(&self) -> Result<ShopsCurrentApplicationsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/applications".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_brand_authorizations_list(&self) -> Result<ShopsCurrentBrandAuthorizationsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/brand_authorizations".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn shops_current_business_hours_retrieve(&self) -> Result<ShopsCurrentBusinessHoursRetrieveResult, SdkworkError> {
        let path = app_path(&"/shops/current/business_hours".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_category_bindings_list(&self) -> Result<ShopsCurrentCategoryBindingsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/category_bindings".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_channels_list(&self) -> Result<ShopsCurrentChannelsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/channels".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_customer_services_list(&self) -> Result<ShopsCurrentCustomerServicesListResult, SdkworkError> {
        let path = app_path(&"/shops/current/customer_services".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn shops_current_dashboard_retrieve(&self) -> Result<ShopsCurrentDashboardRetrieveResult, SdkworkError> {
        let path = app_path(&"/shops/current/dashboard".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn shops_current_deposit_account_retrieve(&self) -> Result<ShopsCurrentDepositAccountRetrieveResult, SdkworkError> {
        let path = app_path(&"/shops/current/deposit_account".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn shops_current_fulfillment_profile_retrieve(&self) -> Result<ShopsCurrentFulfillmentProfileRetrieveResult, SdkworkError> {
        let path = app_path(&"/shops/current/fulfillment_profile".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_inventory_stocks_list(&self) -> Result<ShopsCurrentInventoryStocksListResult, SdkworkError> {
        let path = app_path(&"/shops/current/inventory/stocks".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_orders_list(&self) -> Result<ShopsCurrentOrdersListResult, SdkworkError> {
        let path = app_path(&"/shops/current/orders".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn shops_current_orders_retrieve(&self, order_id: &str) -> Result<ShopsCurrentOrdersRetrieveResult, SdkworkError> {
        let path = app_path(&format!("/shops/current/orders/{}", serialize_path_parameter(order_id, PathParameterSpec::new("orderId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_policies_list(&self) -> Result<ShopsCurrentPoliciesListResult, SdkworkError> {
        let path = app_path(&"/shops/current/policies".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_products_list(&self) -> Result<ShopsCurrentProductsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/products".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_qualifications_list(&self) -> Result<ShopsCurrentQualificationsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/qualifications".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn shops_current_readiness_retrieve(&self) -> Result<ShopsCurrentReadinessRetrieveResult, SdkworkError> {
        let path = app_path(&"/shops/current/readiness".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_return_addresses_list(&self) -> Result<ShopsCurrentReturnAddressesListResult, SdkworkError> {
        let path = app_path(&"/shops/current/return_addresses".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_risk_signals_list(&self) -> Result<ShopsCurrentRiskSignalsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/risk_signals".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_service_areas_list(&self) -> Result<ShopsCurrentServiceAreasListResult, SdkworkError> {
        let path = app_path(&"/shops/current/service_areas".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn shops_current_settlement_profile_retrieve(&self) -> Result<ShopsCurrentSettlementProfileRetrieveResult, SdkworkError> {
        let path = app_path(&"/shops/current/settlement_profile".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_settlements_list(&self) -> Result<ShopsCurrentSettlementsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/settlements".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_shipping_templates_list(&self) -> Result<ShopsCurrentShippingTemplatesListResult, SdkworkError> {
        let path = app_path(&"/shops/current/shipping_templates".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_status_events_list(&self) -> Result<ShopsCurrentStatusEventsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/status_events".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn shops_current_verifications_list(&self) -> Result<ShopsCurrentVerificationsListResult, SdkworkError> {
        let path = app_path(&"/shops/current/verifications".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn shops_retrieve(&self, shop_id: &str) -> Result<ShopsRetrieveResult, SdkworkError> {
        let path = app_path(&format!("/shops/{}", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.get(&path, None, None).await
    }

    /// Create
    pub async fn after_sales_requests_create(&self) -> Result<AfterSalesRequestsCreateResult, SdkworkError> {
        let path = app_path(&"/system/after_sales/requests".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn after_sales_requests_update(&self, after_sales_request_id: &str) -> Result<AfterSalesRequestsUpdateResult, SdkworkError> {
        let path = app_path(&format!("/system/after_sales/requests/{}", serialize_path_parameter(after_sales_request_id, PathParameterSpec::new("afterSalesRequestId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn after_sales_return_shipments_create(&self, after_sales_request_id: &str) -> Result<AfterSalesReturnShipmentsCreateResult, SdkworkError> {
        let path = app_path(&format!("/system/after_sales/requests/{}/return_shipments", serialize_path_parameter(after_sales_request_id, PathParameterSpec::new("afterSalesRequestId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_current_applications_create(&self) -> Result<ShopsCurrentApplicationsCreateResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/applications".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_current_brand_authorizations_upsert(&self) -> Result<ShopsCurrentBrandAuthorizationsUpsertResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/brand_authorizations".to_string());
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_current_business_hours_update(&self) -> Result<ShopsCurrentBusinessHoursUpdateResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/business_hours".to_string());
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_current_category_bindings_upsert(&self) -> Result<ShopsCurrentCategoryBindingsUpsertResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/category_bindings".to_string());
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_current_channels_update(&self, channel_id: &str) -> Result<ShopsCurrentChannelsUpdateResult, SdkworkError> {
        let path = app_path(&format!("/system/shops/current/channels/{}", serialize_path_parameter(channel_id, PathParameterSpec::new("channelId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_current_customer_services_upsert(&self) -> Result<ShopsCurrentCustomerServicesUpsertResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/customer_services".to_string());
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_current_fulfillment_profile_update(&self) -> Result<ShopsCurrentFulfillmentProfileUpdateResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/fulfillment_profile".to_string());
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_current_inventory_stocks_adjustments_create(&self, stock_id: &str) -> Result<ShopsCurrentInventoryStocksAdjustmentsCreateResult, SdkworkError> {
        let path = app_path(&format!("/system/shops/current/inventory/stocks/{}/adjustments", serialize_path_parameter(stock_id, PathParameterSpec::new("stockId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_current_orders_fulfillments_create(&self, order_id: &str) -> Result<ShopsCurrentOrdersFulfillmentsCreateResult, SdkworkError> {
        let path = app_path(&format!("/system/shops/current/orders/{}/fulfillments", serialize_path_parameter(order_id, PathParameterSpec::new("orderId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_current_policies_update(&self, policy_id: &str) -> Result<ShopsCurrentPoliciesUpdateResult, SdkworkError> {
        let path = app_path(&format!("/system/shops/current/policies/{}", serialize_path_parameter(policy_id, PathParameterSpec::new("policyId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_current_products_create(&self) -> Result<ShopsCurrentProductsCreateResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/products".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_current_products_update(&self, product_id: &str) -> Result<ShopsCurrentProductsUpdateResult, SdkworkError> {
        let path = app_path(&format!("/system/shops/current/products/{}", serialize_path_parameter(product_id, PathParameterSpec::new("productId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Publish
    pub async fn shops_current_products_publish(&self, product_id: &str) -> Result<ShopsCurrentProductsPublishResult, SdkworkError> {
        let path = app_path(&format!("/system/shops/current/products/{}/publish", serialize_path_parameter(product_id, PathParameterSpec::new("productId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Unpublish
    pub async fn shops_current_products_unpublish(&self, product_id: &str) -> Result<ShopsCurrentProductsUnpublishResult, SdkworkError> {
        let path = app_path(&format!("/system/shops/current/products/{}/unpublish", serialize_path_parameter(product_id, PathParameterSpec::new("productId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_current_qualifications_upsert(&self) -> Result<ShopsCurrentQualificationsUpsertResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/qualifications".to_string());
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_current_return_addresses_upsert(&self) -> Result<ShopsCurrentReturnAddressesUpsertResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/return_addresses".to_string());
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_current_service_areas_create(&self) -> Result<ShopsCurrentServiceAreasCreateResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/service_areas".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_current_service_areas_update(&self, service_area_id: &str) -> Result<ShopsCurrentServiceAreasUpdateResult, SdkworkError> {
        let path = app_path(&format!("/system/shops/current/service_areas/{}", serialize_path_parameter(service_area_id, PathParameterSpec::new("serviceAreaId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_current_settlement_profile_update(&self) -> Result<ShopsCurrentSettlementProfileUpdateResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/settlement_profile".to_string());
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_current_shipping_templates_upsert(&self) -> Result<ShopsCurrentShippingTemplatesUpsertResult, SdkworkError> {
        let path = app_path(&"/system/shops/current/shipping_templates".to_string());
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Retrieve
    pub async fn site_runtime_retrieve(&self) -> Result<SiteRuntimeRetrieveResult, SdkworkError> {
        let path = app_path(&"/system/site/runtime".to_string());
        self.client.get(&path, None, None).await
    }

}

struct PathParameterSpec<'a> {
    name: &'a str,
    style: &'a str,
    explode: bool,
}

impl<'a> PathParameterSpec<'a> {
    fn new(name: &'a str, style: &'a str, explode: bool) -> Self {
        Self { name, style, explode }
    }
}

fn serialize_path_parameter<T: serde::Serialize>(value: T, spec: PathParameterSpec<'_>) -> String {
    let value = serde_json::to_value(value).unwrap_or(serde_json::Value::Null);
    if value.is_null() {
        return String::new();
    }
    let style = if spec.style.is_empty() { "simple" } else { spec.style };
    match value {
        serde_json::Value::Array(values) => serialize_path_array(spec.name, &values, style, spec.explode),
        serde_json::Value::Object(values) => serialize_path_object(spec.name, &values, style, spec.explode),
        value => format!("{}{}", path_primitive_prefix(spec.name, style), percent_encode(&primitive_to_string(&value))),
    }
}

fn serialize_path_array(name: &str, values: &[serde_json::Value], style: &str, explode: bool) -> String {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(|value| percent_encode(&primitive_to_string(value)))
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return path_prefix(name, style);
    }
    if style == "matrix" {
        if explode {
            return serialized.iter().map(|item| format!(";{}={}", name, item)).collect::<Vec<_>>().join("");
        }
        return format!(";{}={}", name, serialized.join(","));
    }
    let separator = if explode { "." } else { "," };
    format!("{}{}", path_prefix(name, style), serialized.join(separator))
}

fn serialize_path_object(
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
) -> String {
    let mut entries = Vec::new();
    let mut exploded = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        let escaped_key = percent_encode(key);
        let escaped_value = percent_encode(&primitive_to_string(value));
        if explode {
            if style == "matrix" {
                exploded.push(format!(";{}={}", escaped_key, escaped_value));
            } else {
                exploded.push(format!("{}={}", escaped_key, escaped_value));
            }
        } else {
            entries.push(escaped_key);
            entries.push(escaped_value);
        }
    }
    if style == "matrix" {
        if explode {
            return exploded.join("");
        }
        return format!(";{}={}", name, entries.join(","));
    }
    if explode {
        let separator = if style == "label" { "." } else { "," };
        return format!("{}{}", path_prefix(name, style), exploded.join(separator));
    }
    format!("{}{}", path_prefix(name, style), entries.join(","))
}

fn path_prefix(name: &str, style: &str) -> String {
    match style {
        "label" => ".".to_string(),
        "matrix" => format!(";{}", name),
        _ => String::new(),
    }
}

fn path_primitive_prefix(name: &str, style: &str) -> String {
    if style == "matrix" {
        format!(";{}=", name)
    } else {
        path_prefix(name, style)
    }
}



fn primitive_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(value) => value.clone(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        other => other.to_string(),
    }
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{:02X}", byte).chars().collect(),
        })
        .collect()
}
