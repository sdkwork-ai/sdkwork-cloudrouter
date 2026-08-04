import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class SystemApi {
  final HttpClient _client;

  SystemApi(this._client);

  /// List
  Future<AfterSalesRequestsListResult?> afterSalesRequestsList() async {
    final response = await _client.get(ApiPaths.appPath('/after_sales/requests'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AfterSalesRequestsListResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<AfterSalesRequestsRetrieveResult?> afterSalesRequestsRetrieve(String afterSalesRequestId) async {
    final response = await _client.get(ApiPaths.appPath('/after_sales/requests/${serializePathParameter(afterSalesRequestId, const PathParameterSpec('afterSalesRequestId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AfterSalesRequestsRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<AfterSalesEventsListResult?> afterSalesEventsList(String afterSalesRequestId) async {
    final response = await _client.get(ApiPaths.appPath('/after_sales/requests/${serializePathParameter(afterSalesRequestId, const PathParameterSpec('afterSalesRequestId', 'simple', false))}/events'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AfterSalesEventsListResult.fromJson(map);
    })();
  }

  /// List
  Future<AfterSalesReturnShipmentsListResult?> afterSalesReturnShipmentsList(String afterSalesRequestId) async {
    final response = await _client.get(ApiPaths.appPath('/after_sales/requests/${serializePathParameter(afterSalesRequestId, const PathParameterSpec('afterSalesRequestId', 'simple', false))}/return_shipments'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AfterSalesReturnShipmentsListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsListResult?> shopsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsListResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ShopsCurrentRetrieveResult?> shopsCurrentRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentApplicationsListResult?> shopsCurrentApplicationsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/applications'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentApplicationsListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentBrandAuthorizationsListResult?> shopsCurrentBrandAuthorizationsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/brand_authorizations'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentBrandAuthorizationsListResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ShopsCurrentBusinessHoursRetrieveResult?> shopsCurrentBusinessHoursRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/business_hours'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentBusinessHoursRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentCategoryBindingsListResult?> shopsCurrentCategoryBindingsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/category_bindings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentCategoryBindingsListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentChannelsListResult?> shopsCurrentChannelsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/channels'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentChannelsListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentCustomerServicesListResult?> shopsCurrentCustomerServicesList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/customer_services'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentCustomerServicesListResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ShopsCurrentDashboardRetrieveResult?> shopsCurrentDashboardRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/dashboard'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentDashboardRetrieveResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ShopsCurrentDepositAccountRetrieveResult?> shopsCurrentDepositAccountRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/deposit_account'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentDepositAccountRetrieveResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ShopsCurrentFulfillmentProfileRetrieveResult?> shopsCurrentFulfillmentProfileRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/fulfillment_profile'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentFulfillmentProfileRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentInventoryStocksListResult?> shopsCurrentInventoryStocksList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/inventory/stocks'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentInventoryStocksListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentOrdersListResult?> shopsCurrentOrdersList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/orders'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentOrdersListResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ShopsCurrentOrdersRetrieveResult?> shopsCurrentOrdersRetrieve(String orderId) async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/orders/${serializePathParameter(orderId, const PathParameterSpec('orderId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentOrdersRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentPoliciesListResult?> shopsCurrentPoliciesList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/policies'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentPoliciesListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentProductsListResult?> shopsCurrentProductsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/products'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentProductsListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentQualificationsListResult?> shopsCurrentQualificationsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/qualifications'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentQualificationsListResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ShopsCurrentReadinessRetrieveResult?> shopsCurrentReadinessRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/readiness'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentReadinessRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentReturnAddressesListResult?> shopsCurrentReturnAddressesList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/return_addresses'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentReturnAddressesListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentRiskSignalsListResult?> shopsCurrentRiskSignalsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/risk_signals'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentRiskSignalsListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentServiceAreasListResult?> shopsCurrentServiceAreasList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/service_areas'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentServiceAreasListResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ShopsCurrentSettlementProfileRetrieveResult?> shopsCurrentSettlementProfileRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/settlement_profile'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentSettlementProfileRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentSettlementsListResult?> shopsCurrentSettlementsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/settlements'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentSettlementsListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentShippingTemplatesListResult?> shopsCurrentShippingTemplatesList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/shipping_templates'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentShippingTemplatesListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentStatusEventsListResult?> shopsCurrentStatusEventsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/status_events'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentStatusEventsListResult.fromJson(map);
    })();
  }

  /// List
  Future<ShopsCurrentVerificationsListResult?> shopsCurrentVerificationsList() async {
    final response = await _client.get(ApiPaths.appPath('/shops/current/verifications'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentVerificationsListResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ShopsRetrieveResult?> shopsRetrieve(String shopId) async {
    final response = await _client.get(ApiPaths.appPath('/shops/${serializePathParameter(shopId, const PathParameterSpec('shopId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsRetrieveResult.fromJson(map);
    })();
  }

  /// Create
  Future<AfterSalesRequestsCreateResult?> afterSalesRequestsCreate() async {
    final response = await _client.post(ApiPaths.appPath('/system/after_sales/requests'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AfterSalesRequestsCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<AfterSalesRequestsUpdateResult?> afterSalesRequestsUpdate(String afterSalesRequestId) async {
    final response = await _client.patch(ApiPaths.appPath('/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, const PathParameterSpec('afterSalesRequestId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AfterSalesRequestsUpdateResult.fromJson(map);
    })();
  }

  /// Create
  Future<AfterSalesReturnShipmentsCreateResult?> afterSalesReturnShipmentsCreate(String afterSalesRequestId) async {
    final response = await _client.post(ApiPaths.appPath('/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, const PathParameterSpec('afterSalesRequestId', 'simple', false))}/return_shipments'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AfterSalesReturnShipmentsCreateResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsCurrentApplicationsCreateResult?> shopsCurrentApplicationsCreate() async {
    final response = await _client.post(ApiPaths.appPath('/system/shops/current/applications'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentApplicationsCreateResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsCurrentBrandAuthorizationsUpsertResult?> shopsCurrentBrandAuthorizationsUpsert() async {
    final response = await _client.put(ApiPaths.appPath('/system/shops/current/brand_authorizations'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentBrandAuthorizationsUpsertResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsCurrentBusinessHoursUpdateResult?> shopsCurrentBusinessHoursUpdate() async {
    final response = await _client.patch(ApiPaths.appPath('/system/shops/current/business_hours'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentBusinessHoursUpdateResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsCurrentCategoryBindingsUpsertResult?> shopsCurrentCategoryBindingsUpsert() async {
    final response = await _client.put(ApiPaths.appPath('/system/shops/current/category_bindings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentCategoryBindingsUpsertResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsCurrentChannelsUpdateResult?> shopsCurrentChannelsUpdate(String channelId) async {
    final response = await _client.patch(ApiPaths.appPath('/system/shops/current/channels/${serializePathParameter(channelId, const PathParameterSpec('channelId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentChannelsUpdateResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsCurrentCustomerServicesUpsertResult?> shopsCurrentCustomerServicesUpsert() async {
    final response = await _client.put(ApiPaths.appPath('/system/shops/current/customer_services'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentCustomerServicesUpsertResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsCurrentFulfillmentProfileUpdateResult?> shopsCurrentFulfillmentProfileUpdate() async {
    final response = await _client.patch(ApiPaths.appPath('/system/shops/current/fulfillment_profile'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentFulfillmentProfileUpdateResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsCurrentInventoryStocksAdjustmentsCreateResult?> shopsCurrentInventoryStocksAdjustmentsCreate(String stockId) async {
    final response = await _client.post(ApiPaths.appPath('/system/shops/current/inventory/stocks/${serializePathParameter(stockId, const PathParameterSpec('stockId', 'simple', false))}/adjustments'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentInventoryStocksAdjustmentsCreateResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsCurrentOrdersFulfillmentsCreateResult?> shopsCurrentOrdersFulfillmentsCreate(String orderId) async {
    final response = await _client.post(ApiPaths.appPath('/system/shops/current/orders/${serializePathParameter(orderId, const PathParameterSpec('orderId', 'simple', false))}/fulfillments'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentOrdersFulfillmentsCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsCurrentPoliciesUpdateResult?> shopsCurrentPoliciesUpdate(String policyId) async {
    final response = await _client.patch(ApiPaths.appPath('/system/shops/current/policies/${serializePathParameter(policyId, const PathParameterSpec('policyId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentPoliciesUpdateResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsCurrentProductsCreateResult?> shopsCurrentProductsCreate() async {
    final response = await _client.post(ApiPaths.appPath('/system/shops/current/products'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentProductsCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsCurrentProductsUpdateResult?> shopsCurrentProductsUpdate(String productId) async {
    final response = await _client.patch(ApiPaths.appPath('/system/shops/current/products/${serializePathParameter(productId, const PathParameterSpec('productId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentProductsUpdateResult.fromJson(map);
    })();
  }

  /// Publish
  Future<ShopsCurrentProductsPublishResult?> shopsCurrentProductsPublish(String productId) async {
    final response = await _client.post(ApiPaths.appPath('/system/shops/current/products/${serializePathParameter(productId, const PathParameterSpec('productId', 'simple', false))}/publish'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentProductsPublishResult.fromJson(map);
    })();
  }

  /// Unpublish
  Future<ShopsCurrentProductsUnpublishResult?> shopsCurrentProductsUnpublish(String productId) async {
    final response = await _client.post(ApiPaths.appPath('/system/shops/current/products/${serializePathParameter(productId, const PathParameterSpec('productId', 'simple', false))}/unpublish'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentProductsUnpublishResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsCurrentQualificationsUpsertResult?> shopsCurrentQualificationsUpsert() async {
    final response = await _client.put(ApiPaths.appPath('/system/shops/current/qualifications'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentQualificationsUpsertResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsCurrentReturnAddressesUpsertResult?> shopsCurrentReturnAddressesUpsert() async {
    final response = await _client.put(ApiPaths.appPath('/system/shops/current/return_addresses'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentReturnAddressesUpsertResult.fromJson(map);
    })();
  }

  /// Create
  Future<ShopsCurrentServiceAreasCreateResult?> shopsCurrentServiceAreasCreate() async {
    final response = await _client.post(ApiPaths.appPath('/system/shops/current/service_areas'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentServiceAreasCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsCurrentServiceAreasUpdateResult?> shopsCurrentServiceAreasUpdate(String serviceAreaId) async {
    final response = await _client.patch(ApiPaths.appPath('/system/shops/current/service_areas/${serializePathParameter(serviceAreaId, const PathParameterSpec('serviceAreaId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentServiceAreasUpdateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ShopsCurrentSettlementProfileUpdateResult?> shopsCurrentSettlementProfileUpdate() async {
    final response = await _client.patch(ApiPaths.appPath('/system/shops/current/settlement_profile'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentSettlementProfileUpdateResult.fromJson(map);
    })();
  }

  /// Upsert
  Future<ShopsCurrentShippingTemplatesUpsertResult?> shopsCurrentShippingTemplatesUpsert() async {
    final response = await _client.put(ApiPaths.appPath('/system/shops/current/shipping_templates'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ShopsCurrentShippingTemplatesUpsertResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<SiteRuntimeRetrieveResult?> siteRuntimeRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/system/site/runtime'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SiteRuntimeRetrieveResult.fromJson(map);
    })();
  }
}

class PathParameterSpec {
  final String name;
  final String style;
  final bool explode;

  const PathParameterSpec(this.name, this.style, this.explode);
}

String serializePathParameter(dynamic value, PathParameterSpec spec) {
  if (value == null) return '';
  final style = spec.style.trim().isEmpty ? 'simple' : spec.style;
  if (value is Iterable) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (value is Map) {
    return serializePathObject(spec.name, value, style, spec.explode);
  }
  return pathPrimitivePrefix(spec.name, style) + Uri.encodeComponent(value.toString());
}

String serializePathArray(String name, Iterable values, String style, bool explode) {
  final serialized = values.where((item) => item != null).map((item) => Uri.encodeComponent(item.toString())).toList();
  if (serialized.isEmpty) return pathPrefix(name, style);
  if (style == 'matrix') {
    if (explode) {
      return serialized.map((item) => ';$name=$item').join();
    }
    return ';$name=${serialized.join(',')}';
  }
  final separator = explode ? '.' : ',';
  return pathPrefix(name, style) + serialized.join(separator);
}

String serializePathObject(String name, Map values, String style, bool explode) {
  final entries = <String>[];
  final exploded = <String>[];
  values.forEach((key, value) {
    if (value == null) return;
    final escapedKey = Uri.encodeComponent(key.toString());
    final escapedValue = Uri.encodeComponent(value.toString());
    if (explode) {
      if (style == 'matrix') {
        exploded.add(';$escapedKey=$escapedValue');
      } else {
        exploded.add('$escapedKey=$escapedValue');
      }
    } else {
      entries.add(escapedKey);
      entries.add(escapedValue);
    }
  });
  if (style == 'matrix') {
    if (explode) return exploded.join();
    return ';$name=${entries.join(',')}';
  }
  if (explode) {
    final separator = style == 'label' ? '.' : ',';
    return pathPrefix(name, style) + exploded.join(separator);
  }
  return pathPrefix(name, style) + entries.join(',');
}

String pathPrefix(String name, String style) {
  if (style == 'label') return '.';
  if (style == 'matrix') return ';$name';
  return '';
}

String pathPrimitivePrefix(String name, String style) {
  return style == 'matrix' ? ';$name=' : pathPrefix(name, style);
}
