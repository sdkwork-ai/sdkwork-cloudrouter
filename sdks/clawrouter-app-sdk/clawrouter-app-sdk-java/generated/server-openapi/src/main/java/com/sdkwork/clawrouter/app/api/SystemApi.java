package com.sdkwork.clawrouter.app.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.app.http.HttpClient;
import com.sdkwork.clawrouter.app.model.*;
import java.util.List;
import java.util.Map;

public class SystemApi {
    private final HttpClient client;

    public SystemApi(HttpClient client) {
        this.client = client;
    }

    /** List */
    public AfterSalesRequestsListResult afterSalesRequestsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/after_sales/requests"));
        return client.convertValue(raw, new TypeReference<AfterSalesRequestsListResult>() {});
    }

    /** Retrieve */
    public AfterSalesRequestsRetrieveResult afterSalesRequestsRetrieve(String afterSalesRequestId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/after_sales/requests/" + serializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<AfterSalesRequestsRetrieveResult>() {});
    }

    /** List */
    public AfterSalesEventsListResult afterSalesEventsList(String afterSalesRequestId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/after_sales/requests/" + serializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false)) + "/events"));
        return client.convertValue(raw, new TypeReference<AfterSalesEventsListResult>() {});
    }

    /** List */
    public AfterSalesReturnShipmentsListResult afterSalesReturnShipmentsList(String afterSalesRequestId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/after_sales/requests/" + serializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false)) + "/return_shipments"));
        return client.convertValue(raw, new TypeReference<AfterSalesReturnShipmentsListResult>() {});
    }

    /** List */
    public ShopsListResult shopsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops"));
        return client.convertValue(raw, new TypeReference<ShopsListResult>() {});
    }

    /** Retrieve */
    public ShopsCurrentRetrieveResult shopsCurrentRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentRetrieveResult>() {});
    }

    /** List */
    public ShopsCurrentApplicationsListResult shopsCurrentApplicationsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/applications"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentApplicationsListResult>() {});
    }

    /** List */
    public ShopsCurrentBrandAuthorizationsListResult shopsCurrentBrandAuthorizationsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/brand_authorizations"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentBrandAuthorizationsListResult>() {});
    }

    /** Retrieve */
    public ShopsCurrentBusinessHoursRetrieveResult shopsCurrentBusinessHoursRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/business_hours"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentBusinessHoursRetrieveResult>() {});
    }

    /** List */
    public ShopsCurrentCategoryBindingsListResult shopsCurrentCategoryBindingsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/category_bindings"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentCategoryBindingsListResult>() {});
    }

    /** List */
    public ShopsCurrentChannelsListResult shopsCurrentChannelsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/channels"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentChannelsListResult>() {});
    }

    /** List */
    public ShopsCurrentCustomerServicesListResult shopsCurrentCustomerServicesList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/customer_services"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentCustomerServicesListResult>() {});
    }

    /** Retrieve */
    public ShopsCurrentDashboardRetrieveResult shopsCurrentDashboardRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/dashboard"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentDashboardRetrieveResult>() {});
    }

    /** Retrieve */
    public ShopsCurrentDepositAccountRetrieveResult shopsCurrentDepositAccountRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/deposit_account"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentDepositAccountRetrieveResult>() {});
    }

    /** Retrieve */
    public ShopsCurrentFulfillmentProfileRetrieveResult shopsCurrentFulfillmentProfileRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/fulfillment_profile"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentFulfillmentProfileRetrieveResult>() {});
    }

    /** List */
    public ShopsCurrentInventoryStocksListResult shopsCurrentInventoryStocksList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/inventory/stocks"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentInventoryStocksListResult>() {});
    }

    /** List */
    public ShopsCurrentOrdersListResult shopsCurrentOrdersList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/orders"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentOrdersListResult>() {});
    }

    /** Retrieve */
    public ShopsCurrentOrdersRetrieveResult shopsCurrentOrdersRetrieve(String orderId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/orders/" + serializePathParameter(orderId, new PathParameterSpec("orderId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ShopsCurrentOrdersRetrieveResult>() {});
    }

    /** List */
    public ShopsCurrentPoliciesListResult shopsCurrentPoliciesList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/policies"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentPoliciesListResult>() {});
    }

    /** List */
    public ShopsCurrentProductsListResult shopsCurrentProductsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/products"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentProductsListResult>() {});
    }

    /** List */
    public ShopsCurrentQualificationsListResult shopsCurrentQualificationsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/qualifications"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentQualificationsListResult>() {});
    }

    /** Retrieve */
    public ShopsCurrentReadinessRetrieveResult shopsCurrentReadinessRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/readiness"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentReadinessRetrieveResult>() {});
    }

    /** List */
    public ShopsCurrentReturnAddressesListResult shopsCurrentReturnAddressesList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/return_addresses"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentReturnAddressesListResult>() {});
    }

    /** List */
    public ShopsCurrentRiskSignalsListResult shopsCurrentRiskSignalsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/risk_signals"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentRiskSignalsListResult>() {});
    }

    /** List */
    public ShopsCurrentServiceAreasListResult shopsCurrentServiceAreasList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/service_areas"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentServiceAreasListResult>() {});
    }

    /** Retrieve */
    public ShopsCurrentSettlementProfileRetrieveResult shopsCurrentSettlementProfileRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/settlement_profile"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentSettlementProfileRetrieveResult>() {});
    }

    /** List */
    public ShopsCurrentSettlementsListResult shopsCurrentSettlementsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/settlements"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentSettlementsListResult>() {});
    }

    /** List */
    public ShopsCurrentShippingTemplatesListResult shopsCurrentShippingTemplatesList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/shipping_templates"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentShippingTemplatesListResult>() {});
    }

    /** List */
    public ShopsCurrentStatusEventsListResult shopsCurrentStatusEventsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/status_events"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentStatusEventsListResult>() {});
    }

    /** List */
    public ShopsCurrentVerificationsListResult shopsCurrentVerificationsList() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/current/verifications"));
        return client.convertValue(raw, new TypeReference<ShopsCurrentVerificationsListResult>() {});
    }

    /** Retrieve */
    public ShopsRetrieveResult shopsRetrieve(String shopId) throws Exception {
        Object raw = client.get(ApiPaths.appPath("/shops/" + serializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<ShopsRetrieveResult>() {});
    }

    /** Create */
    public AfterSalesRequestsCreateResult afterSalesRequestsCreate() throws Exception {
        Object raw = client.post(ApiPaths.appPath("/system/after_sales/requests"), null);
        return client.convertValue(raw, new TypeReference<AfterSalesRequestsCreateResult>() {});
    }

    /** Update */
    public AfterSalesRequestsUpdateResult afterSalesRequestsUpdate(String afterSalesRequestId) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/system/after_sales/requests/" + serializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<AfterSalesRequestsUpdateResult>() {});
    }

    /** Create */
    public AfterSalesReturnShipmentsCreateResult afterSalesReturnShipmentsCreate(String afterSalesRequestId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/system/after_sales/requests/" + serializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false)) + "/return_shipments"), null);
        return client.convertValue(raw, new TypeReference<AfterSalesReturnShipmentsCreateResult>() {});
    }

    /** Create */
    public ShopsCurrentApplicationsCreateResult shopsCurrentApplicationsCreate() throws Exception {
        Object raw = client.post(ApiPaths.appPath("/system/shops/current/applications"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentApplicationsCreateResult>() {});
    }

    /** Upsert */
    public ShopsCurrentBrandAuthorizationsUpsertResult shopsCurrentBrandAuthorizationsUpsert() throws Exception {
        Object raw = client.put(ApiPaths.appPath("/system/shops/current/brand_authorizations"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentBrandAuthorizationsUpsertResult>() {});
    }

    /** Update */
    public ShopsCurrentBusinessHoursUpdateResult shopsCurrentBusinessHoursUpdate() throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/system/shops/current/business_hours"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentBusinessHoursUpdateResult>() {});
    }

    /** Upsert */
    public ShopsCurrentCategoryBindingsUpsertResult shopsCurrentCategoryBindingsUpsert() throws Exception {
        Object raw = client.put(ApiPaths.appPath("/system/shops/current/category_bindings"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentCategoryBindingsUpsertResult>() {});
    }

    /** Update */
    public ShopsCurrentChannelsUpdateResult shopsCurrentChannelsUpdate(String channelId) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/system/shops/current/channels/" + serializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentChannelsUpdateResult>() {});
    }

    /** Upsert */
    public ShopsCurrentCustomerServicesUpsertResult shopsCurrentCustomerServicesUpsert() throws Exception {
        Object raw = client.put(ApiPaths.appPath("/system/shops/current/customer_services"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentCustomerServicesUpsertResult>() {});
    }

    /** Update */
    public ShopsCurrentFulfillmentProfileUpdateResult shopsCurrentFulfillmentProfileUpdate() throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/system/shops/current/fulfillment_profile"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentFulfillmentProfileUpdateResult>() {});
    }

    /** Create */
    public ShopsCurrentInventoryStocksAdjustmentsCreateResult shopsCurrentInventoryStocksAdjustmentsCreate(String stockId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/system/shops/current/inventory/stocks/" + serializePathParameter(stockId, new PathParameterSpec("stockId", "simple", false)) + "/adjustments"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentInventoryStocksAdjustmentsCreateResult>() {});
    }

    /** Create */
    public ShopsCurrentOrdersFulfillmentsCreateResult shopsCurrentOrdersFulfillmentsCreate(String orderId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/system/shops/current/orders/" + serializePathParameter(orderId, new PathParameterSpec("orderId", "simple", false)) + "/fulfillments"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentOrdersFulfillmentsCreateResult>() {});
    }

    /** Update */
    public ShopsCurrentPoliciesUpdateResult shopsCurrentPoliciesUpdate(String policyId) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/system/shops/current/policies/" + serializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentPoliciesUpdateResult>() {});
    }

    /** Create */
    public ShopsCurrentProductsCreateResult shopsCurrentProductsCreate() throws Exception {
        Object raw = client.post(ApiPaths.appPath("/system/shops/current/products"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentProductsCreateResult>() {});
    }

    /** Update */
    public ShopsCurrentProductsUpdateResult shopsCurrentProductsUpdate(String productId) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/system/shops/current/products/" + serializePathParameter(productId, new PathParameterSpec("productId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentProductsUpdateResult>() {});
    }

    /** Publish */
    public ShopsCurrentProductsPublishResult shopsCurrentProductsPublish(String productId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/system/shops/current/products/" + serializePathParameter(productId, new PathParameterSpec("productId", "simple", false)) + "/publish"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentProductsPublishResult>() {});
    }

    /** Unpublish */
    public ShopsCurrentProductsUnpublishResult shopsCurrentProductsUnpublish(String productId) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/system/shops/current/products/" + serializePathParameter(productId, new PathParameterSpec("productId", "simple", false)) + "/unpublish"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentProductsUnpublishResult>() {});
    }

    /** Upsert */
    public ShopsCurrentQualificationsUpsertResult shopsCurrentQualificationsUpsert() throws Exception {
        Object raw = client.put(ApiPaths.appPath("/system/shops/current/qualifications"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentQualificationsUpsertResult>() {});
    }

    /** Upsert */
    public ShopsCurrentReturnAddressesUpsertResult shopsCurrentReturnAddressesUpsert() throws Exception {
        Object raw = client.put(ApiPaths.appPath("/system/shops/current/return_addresses"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentReturnAddressesUpsertResult>() {});
    }

    /** Create */
    public ShopsCurrentServiceAreasCreateResult shopsCurrentServiceAreasCreate() throws Exception {
        Object raw = client.post(ApiPaths.appPath("/system/shops/current/service_areas"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentServiceAreasCreateResult>() {});
    }

    /** Update */
    public ShopsCurrentServiceAreasUpdateResult shopsCurrentServiceAreasUpdate(String serviceAreaId) throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/system/shops/current/service_areas/" + serializePathParameter(serviceAreaId, new PathParameterSpec("serviceAreaId", "simple", false)) + ""), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentServiceAreasUpdateResult>() {});
    }

    /** Update */
    public ShopsCurrentSettlementProfileUpdateResult shopsCurrentSettlementProfileUpdate() throws Exception {
        Object raw = client.patch(ApiPaths.appPath("/system/shops/current/settlement_profile"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentSettlementProfileUpdateResult>() {});
    }

    /** Upsert */
    public ShopsCurrentShippingTemplatesUpsertResult shopsCurrentShippingTemplatesUpsert() throws Exception {
        Object raw = client.put(ApiPaths.appPath("/system/shops/current/shipping_templates"), null);
        return client.convertValue(raw, new TypeReference<ShopsCurrentShippingTemplatesUpsertResult>() {});
    }

    /** Retrieve */
    public SiteRuntimeRetrieveResult siteRuntimeRetrieve() throws Exception {
        Object raw = client.get(ApiPaths.appPath("/system/site/runtime"));
        return client.convertValue(raw, new TypeReference<SiteRuntimeRetrieveResult>() {});
    }

    private record PathParameterSpec(String name, String style, boolean explode) {}

    private static String serializePathParameter(Object value, PathParameterSpec spec) {
        if (value == null) {
            return "";
        }
        String style = spec.style() == null || spec.style().isBlank() ? "simple" : spec.style();
        if (value instanceof Iterable<?> iterable) {
            return serializePathArray(spec.name(), iterable, style, spec.explode());
        }
        if (value instanceof Map<?, ?> map) {
            return serializePathObject(spec.name(), map, style, spec.explode());
        }
        return pathPrimitivePrefix(spec.name(), style) + pathEncode(String.valueOf(value));
    }

    private static String serializePathArray(String name, Iterable<?> values, String style, boolean explode) {
        List<String> serialized = new java.util.ArrayList<>();
        for (Object item : values) {
            if (item != null) {
                serialized.add(pathEncode(String.valueOf(item)));
            }
        }
        if (serialized.isEmpty()) {
            return pathPrefix(name, style);
        }
        if ("matrix".equals(style)) {
            if (explode) {
                List<String> parts = new java.util.ArrayList<>();
                for (String item : serialized) {
                    parts.add(";" + name + "=" + item);
                }
                return String.join("", parts);
            }
            return ";" + name + "=" + String.join(",", serialized);
        }
        String separator = explode ? "." : ",";
        return pathPrefix(name, style) + String.join(separator, serialized);
    }

    private static String serializePathObject(String name, Map<?, ?> values, String style, boolean explode) {
        List<String> entries = new java.util.ArrayList<>();
        List<String> exploded = new java.util.ArrayList<>();
        values.forEach((key, value) -> {
            if (value == null) {
                return;
            }
            String escapedKey = pathEncode(String.valueOf(key));
            String escapedValue = pathEncode(String.valueOf(value));
            if (explode) {
                if ("matrix".equals(style)) {
                    exploded.add(";" + escapedKey + "=" + escapedValue);
                } else {
                    exploded.add(escapedKey + "=" + escapedValue);
                }
            } else {
                entries.add(escapedKey);
                entries.add(escapedValue);
            }
        });
        if ("matrix".equals(style)) {
            if (explode) {
                return String.join("", exploded);
            }
            return ";" + name + "=" + String.join(",", entries);
        }
        if (explode) {
            String separator = "label".equals(style) ? "." : ",";
            return pathPrefix(name, style) + String.join(separator, exploded);
        }
        return pathPrefix(name, style) + String.join(",", entries);
    }

    private static String pathPrefix(String name, String style) {
        if ("label".equals(style)) {
            return ".";
        }
        if ("matrix".equals(style)) {
            return ";" + name;
        }
        return "";
    }

    private static String pathPrimitivePrefix(String name, String style) {
        if ("matrix".equals(style)) {
            return ";" + name + "=";
        }
        return pathPrefix(name, style);
    }

    private static String pathEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
    }



}
