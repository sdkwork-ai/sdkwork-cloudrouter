import Foundation

public class SystemApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List
    public func afterSalesRequestsList() async throws -> AfterSalesRequestsListResult? {
        return try await client.get(ApiPaths.appPath("/after_sales/requests"), responseType: AfterSalesRequestsListResult.self)
    }

    /// Retrieve
    public func afterSalesRequestsRetrieve(afterSalesRequestId: String) async throws -> AfterSalesRequestsRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/after_sales/requests/\(serializePathParameter(afterSalesRequestId, PathParameterSpec(name: "afterSalesRequestId", style: "simple", explode: false)))"), responseType: AfterSalesRequestsRetrieveResult.self)
    }

    /// List
    public func afterSalesEventsList(afterSalesRequestId: String) async throws -> AfterSalesEventsListResult? {
        return try await client.get(ApiPaths.appPath("/after_sales/requests/\(serializePathParameter(afterSalesRequestId, PathParameterSpec(name: "afterSalesRequestId", style: "simple", explode: false)))/events"), responseType: AfterSalesEventsListResult.self)
    }

    /// List
    public func afterSalesReturnShipmentsList(afterSalesRequestId: String) async throws -> AfterSalesReturnShipmentsListResult? {
        return try await client.get(ApiPaths.appPath("/after_sales/requests/\(serializePathParameter(afterSalesRequestId, PathParameterSpec(name: "afterSalesRequestId", style: "simple", explode: false)))/return_shipments"), responseType: AfterSalesReturnShipmentsListResult.self)
    }

    /// List
    public func shopsList() async throws -> ShopsListResult? {
        return try await client.get(ApiPaths.appPath("/shops"), responseType: ShopsListResult.self)
    }

    /// Retrieve
    public func shopsCurrentRetrieve() async throws -> ShopsCurrentRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/shops/current"), responseType: ShopsCurrentRetrieveResult.self)
    }

    /// List
    public func shopsCurrentApplicationsList() async throws -> ShopsCurrentApplicationsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/applications"), responseType: ShopsCurrentApplicationsListResult.self)
    }

    /// List
    public func shopsCurrentBrandAuthorizationsList() async throws -> ShopsCurrentBrandAuthorizationsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/brand_authorizations"), responseType: ShopsCurrentBrandAuthorizationsListResult.self)
    }

    /// Retrieve
    public func shopsCurrentBusinessHoursRetrieve() async throws -> ShopsCurrentBusinessHoursRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/business_hours"), responseType: ShopsCurrentBusinessHoursRetrieveResult.self)
    }

    /// List
    public func shopsCurrentCategoryBindingsList() async throws -> ShopsCurrentCategoryBindingsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/category_bindings"), responseType: ShopsCurrentCategoryBindingsListResult.self)
    }

    /// List
    public func shopsCurrentChannelsList() async throws -> ShopsCurrentChannelsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/channels"), responseType: ShopsCurrentChannelsListResult.self)
    }

    /// List
    public func shopsCurrentCustomerServicesList() async throws -> ShopsCurrentCustomerServicesListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/customer_services"), responseType: ShopsCurrentCustomerServicesListResult.self)
    }

    /// Retrieve
    public func shopsCurrentDashboardRetrieve() async throws -> ShopsCurrentDashboardRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/dashboard"), responseType: ShopsCurrentDashboardRetrieveResult.self)
    }

    /// Retrieve
    public func shopsCurrentDepositAccountRetrieve() async throws -> ShopsCurrentDepositAccountRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/deposit_account"), responseType: ShopsCurrentDepositAccountRetrieveResult.self)
    }

    /// Retrieve
    public func shopsCurrentFulfillmentProfileRetrieve() async throws -> ShopsCurrentFulfillmentProfileRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/fulfillment_profile"), responseType: ShopsCurrentFulfillmentProfileRetrieveResult.self)
    }

    /// List
    public func shopsCurrentInventoryStocksList() async throws -> ShopsCurrentInventoryStocksListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/inventory/stocks"), responseType: ShopsCurrentInventoryStocksListResult.self)
    }

    /// List
    public func shopsCurrentOrdersList() async throws -> ShopsCurrentOrdersListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/orders"), responseType: ShopsCurrentOrdersListResult.self)
    }

    /// Retrieve
    public func shopsCurrentOrdersRetrieve(orderId: String) async throws -> ShopsCurrentOrdersRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/orders/\(serializePathParameter(orderId, PathParameterSpec(name: "orderId", style: "simple", explode: false)))"), responseType: ShopsCurrentOrdersRetrieveResult.self)
    }

    /// List
    public func shopsCurrentPoliciesList() async throws -> ShopsCurrentPoliciesListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/policies"), responseType: ShopsCurrentPoliciesListResult.self)
    }

    /// List
    public func shopsCurrentProductsList() async throws -> ShopsCurrentProductsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/products"), responseType: ShopsCurrentProductsListResult.self)
    }

    /// List
    public func shopsCurrentQualificationsList() async throws -> ShopsCurrentQualificationsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/qualifications"), responseType: ShopsCurrentQualificationsListResult.self)
    }

    /// Retrieve
    public func shopsCurrentReadinessRetrieve() async throws -> ShopsCurrentReadinessRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/readiness"), responseType: ShopsCurrentReadinessRetrieveResult.self)
    }

    /// List
    public func shopsCurrentReturnAddressesList() async throws -> ShopsCurrentReturnAddressesListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/return_addresses"), responseType: ShopsCurrentReturnAddressesListResult.self)
    }

    /// List
    public func shopsCurrentRiskSignalsList() async throws -> ShopsCurrentRiskSignalsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/risk_signals"), responseType: ShopsCurrentRiskSignalsListResult.self)
    }

    /// List
    public func shopsCurrentServiceAreasList() async throws -> ShopsCurrentServiceAreasListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/service_areas"), responseType: ShopsCurrentServiceAreasListResult.self)
    }

    /// Retrieve
    public func shopsCurrentSettlementProfileRetrieve() async throws -> ShopsCurrentSettlementProfileRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/settlement_profile"), responseType: ShopsCurrentSettlementProfileRetrieveResult.self)
    }

    /// List
    public func shopsCurrentSettlementsList() async throws -> ShopsCurrentSettlementsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/settlements"), responseType: ShopsCurrentSettlementsListResult.self)
    }

    /// List
    public func shopsCurrentShippingTemplatesList() async throws -> ShopsCurrentShippingTemplatesListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/shipping_templates"), responseType: ShopsCurrentShippingTemplatesListResult.self)
    }

    /// List
    public func shopsCurrentStatusEventsList() async throws -> ShopsCurrentStatusEventsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/status_events"), responseType: ShopsCurrentStatusEventsListResult.self)
    }

    /// List
    public func shopsCurrentVerificationsList() async throws -> ShopsCurrentVerificationsListResult? {
        return try await client.get(ApiPaths.appPath("/shops/current/verifications"), responseType: ShopsCurrentVerificationsListResult.self)
    }

    /// Retrieve
    public func shopsRetrieve(shopId: String) async throws -> ShopsRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))"), responseType: ShopsRetrieveResult.self)
    }

    /// Create
    public func afterSalesRequestsCreate() async throws -> AfterSalesRequestsCreateResult? {
        return try await client.post(ApiPaths.appPath("/system/after_sales/requests"), body: nil, responseType: AfterSalesRequestsCreateResult.self)
    }

    /// Update
    public func afterSalesRequestsUpdate(afterSalesRequestId: String) async throws -> AfterSalesRequestsUpdateResult? {
        return try await client.patch(ApiPaths.appPath("/system/after_sales/requests/\(serializePathParameter(afterSalesRequestId, PathParameterSpec(name: "afterSalesRequestId", style: "simple", explode: false)))"), body: nil, responseType: AfterSalesRequestsUpdateResult.self)
    }

    /// Create
    public func afterSalesReturnShipmentsCreate(afterSalesRequestId: String) async throws -> AfterSalesReturnShipmentsCreateResult? {
        return try await client.post(ApiPaths.appPath("/system/after_sales/requests/\(serializePathParameter(afterSalesRequestId, PathParameterSpec(name: "afterSalesRequestId", style: "simple", explode: false)))/return_shipments"), body: nil, responseType: AfterSalesReturnShipmentsCreateResult.self)
    }

    /// Create
    public func shopsCurrentApplicationsCreate() async throws -> ShopsCurrentApplicationsCreateResult? {
        return try await client.post(ApiPaths.appPath("/system/shops/current/applications"), body: nil, responseType: ShopsCurrentApplicationsCreateResult.self)
    }

    /// Upsert
    public func shopsCurrentBrandAuthorizationsUpsert() async throws -> ShopsCurrentBrandAuthorizationsUpsertResult? {
        return try await client.put(ApiPaths.appPath("/system/shops/current/brand_authorizations"), body: nil, responseType: ShopsCurrentBrandAuthorizationsUpsertResult.self)
    }

    /// Update
    public func shopsCurrentBusinessHoursUpdate() async throws -> ShopsCurrentBusinessHoursUpdateResult? {
        return try await client.patch(ApiPaths.appPath("/system/shops/current/business_hours"), body: nil, responseType: ShopsCurrentBusinessHoursUpdateResult.self)
    }

    /// Upsert
    public func shopsCurrentCategoryBindingsUpsert() async throws -> ShopsCurrentCategoryBindingsUpsertResult? {
        return try await client.put(ApiPaths.appPath("/system/shops/current/category_bindings"), body: nil, responseType: ShopsCurrentCategoryBindingsUpsertResult.self)
    }

    /// Update
    public func shopsCurrentChannelsUpdate(channelId: String) async throws -> ShopsCurrentChannelsUpdateResult? {
        return try await client.patch(ApiPaths.appPath("/system/shops/current/channels/\(serializePathParameter(channelId, PathParameterSpec(name: "channelId", style: "simple", explode: false)))"), body: nil, responseType: ShopsCurrentChannelsUpdateResult.self)
    }

    /// Upsert
    public func shopsCurrentCustomerServicesUpsert() async throws -> ShopsCurrentCustomerServicesUpsertResult? {
        return try await client.put(ApiPaths.appPath("/system/shops/current/customer_services"), body: nil, responseType: ShopsCurrentCustomerServicesUpsertResult.self)
    }

    /// Update
    public func shopsCurrentFulfillmentProfileUpdate() async throws -> ShopsCurrentFulfillmentProfileUpdateResult? {
        return try await client.patch(ApiPaths.appPath("/system/shops/current/fulfillment_profile"), body: nil, responseType: ShopsCurrentFulfillmentProfileUpdateResult.self)
    }

    /// Create
    public func shopsCurrentInventoryStocksAdjustmentsCreate(stockId: String) async throws -> ShopsCurrentInventoryStocksAdjustmentsCreateResult? {
        return try await client.post(ApiPaths.appPath("/system/shops/current/inventory/stocks/\(serializePathParameter(stockId, PathParameterSpec(name: "stockId", style: "simple", explode: false)))/adjustments"), body: nil, responseType: ShopsCurrentInventoryStocksAdjustmentsCreateResult.self)
    }

    /// Create
    public func shopsCurrentOrdersFulfillmentsCreate(orderId: String) async throws -> ShopsCurrentOrdersFulfillmentsCreateResult? {
        return try await client.post(ApiPaths.appPath("/system/shops/current/orders/\(serializePathParameter(orderId, PathParameterSpec(name: "orderId", style: "simple", explode: false)))/fulfillments"), body: nil, responseType: ShopsCurrentOrdersFulfillmentsCreateResult.self)
    }

    /// Update
    public func shopsCurrentPoliciesUpdate(policyId: String) async throws -> ShopsCurrentPoliciesUpdateResult? {
        return try await client.patch(ApiPaths.appPath("/system/shops/current/policies/\(serializePathParameter(policyId, PathParameterSpec(name: "policyId", style: "simple", explode: false)))"), body: nil, responseType: ShopsCurrentPoliciesUpdateResult.self)
    }

    /// Create
    public func shopsCurrentProductsCreate() async throws -> ShopsCurrentProductsCreateResult? {
        return try await client.post(ApiPaths.appPath("/system/shops/current/products"), body: nil, responseType: ShopsCurrentProductsCreateResult.self)
    }

    /// Update
    public func shopsCurrentProductsUpdate(productId: String) async throws -> ShopsCurrentProductsUpdateResult? {
        return try await client.patch(ApiPaths.appPath("/system/shops/current/products/\(serializePathParameter(productId, PathParameterSpec(name: "productId", style: "simple", explode: false)))"), body: nil, responseType: ShopsCurrentProductsUpdateResult.self)
    }

    /// Publish
    public func shopsCurrentProductsPublish(productId: String) async throws -> ShopsCurrentProductsPublishResult? {
        return try await client.post(ApiPaths.appPath("/system/shops/current/products/\(serializePathParameter(productId, PathParameterSpec(name: "productId", style: "simple", explode: false)))/publish"), body: nil, responseType: ShopsCurrentProductsPublishResult.self)
    }

    /// Unpublish
    public func shopsCurrentProductsUnpublish(productId: String) async throws -> ShopsCurrentProductsUnpublishResult? {
        return try await client.post(ApiPaths.appPath("/system/shops/current/products/\(serializePathParameter(productId, PathParameterSpec(name: "productId", style: "simple", explode: false)))/unpublish"), body: nil, responseType: ShopsCurrentProductsUnpublishResult.self)
    }

    /// Upsert
    public func shopsCurrentQualificationsUpsert() async throws -> ShopsCurrentQualificationsUpsertResult? {
        return try await client.put(ApiPaths.appPath("/system/shops/current/qualifications"), body: nil, responseType: ShopsCurrentQualificationsUpsertResult.self)
    }

    /// Upsert
    public func shopsCurrentReturnAddressesUpsert() async throws -> ShopsCurrentReturnAddressesUpsertResult? {
        return try await client.put(ApiPaths.appPath("/system/shops/current/return_addresses"), body: nil, responseType: ShopsCurrentReturnAddressesUpsertResult.self)
    }

    /// Create
    public func shopsCurrentServiceAreasCreate() async throws -> ShopsCurrentServiceAreasCreateResult? {
        return try await client.post(ApiPaths.appPath("/system/shops/current/service_areas"), body: nil, responseType: ShopsCurrentServiceAreasCreateResult.self)
    }

    /// Update
    public func shopsCurrentServiceAreasUpdate(serviceAreaId: String) async throws -> ShopsCurrentServiceAreasUpdateResult? {
        return try await client.patch(ApiPaths.appPath("/system/shops/current/service_areas/\(serializePathParameter(serviceAreaId, PathParameterSpec(name: "serviceAreaId", style: "simple", explode: false)))"), body: nil, responseType: ShopsCurrentServiceAreasUpdateResult.self)
    }

    /// Update
    public func shopsCurrentSettlementProfileUpdate() async throws -> ShopsCurrentSettlementProfileUpdateResult? {
        return try await client.patch(ApiPaths.appPath("/system/shops/current/settlement_profile"), body: nil, responseType: ShopsCurrentSettlementProfileUpdateResult.self)
    }

    /// Upsert
    public func shopsCurrentShippingTemplatesUpsert() async throws -> ShopsCurrentShippingTemplatesUpsertResult? {
        return try await client.put(ApiPaths.appPath("/system/shops/current/shipping_templates"), body: nil, responseType: ShopsCurrentShippingTemplatesUpsertResult.self)
    }

    /// Retrieve
    public func siteRuntimeRetrieve() async throws -> SiteRuntimeRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/system/site/runtime"), responseType: SiteRuntimeRetrieveResult.self)
    }

    private struct PathParameterSpec {
        let name: String
        let style: String
        let explode: Bool
    }

    private func serializePathParameter(_ value: Any?, _ spec: PathParameterSpec) -> String {
        guard let value else { return "" }
        let style = spec.style.isEmpty ? "simple" : spec.style
        if let array = value as? [Any] {
            return serializePathArray(spec.name, array, style, spec.explode)
        }
        if let object = value as? [String: Any] {
            return serializePathObject(spec.name, object, style, spec.explode)
        }
        return pathPrimitivePrefix(spec.name, style) + pathEncode(String(describing: value))
    }

    private func serializePathArray(_ name: String, _ values: [Any], _ style: String, _ explode: Bool) -> String {
        let serialized = values.map { pathEncode(String(describing: $0)) }
        if serialized.isEmpty { return pathPrefix(name, style) }
        if style == "matrix" {
            if explode {
                return serialized.map { ";\(name)=\($0)" }.joined()
            }
            return ";\(name)=" + serialized.joined(separator: ",")
        }
        let separator = explode ? "." : ","
        return pathPrefix(name, style) + serialized.joined(separator: separator)
    }

    private func serializePathObject(_ name: String, _ values: [String: Any], _ style: String, _ explode: Bool) -> String {
        var entries: [String] = []
        var exploded: [String] = []
        for (key, value) in values {
            let escapedKey = pathEncode(key)
            let escapedValue = pathEncode(String(describing: value))
            if explode {
                if style == "matrix" {
                    exploded.append(";\(escapedKey)=\(escapedValue)")
                } else {
                    exploded.append("\(escapedKey)=\(escapedValue)")
                }
            } else {
                entries.append(escapedKey)
                entries.append(escapedValue)
            }
        }
        if style == "matrix" {
            if explode {
                return exploded.joined()
            }
            return ";\(name)=" + entries.joined(separator: ",")
        }
        if explode {
            let separator = style == "label" ? "." : ","
            return pathPrefix(name, style) + exploded.joined(separator: separator)
        }
        return pathPrefix(name, style) + entries.joined(separator: ",")
    }

    private func pathPrefix(_ name: String, _ style: String) -> String {
        if style == "label" { return "." }
        if style == "matrix" { return ";\(name)" }
        return ""
    }

    private func pathPrimitivePrefix(_ name: String, _ style: String) -> String {
        style == "matrix" ? ";\(name)=" : pathPrefix(name, style)
    }

    private func pathEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
    }


}
