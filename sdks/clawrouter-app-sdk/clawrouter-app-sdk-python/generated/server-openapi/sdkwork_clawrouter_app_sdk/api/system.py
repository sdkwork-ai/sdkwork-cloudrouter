from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import AfterSalesEventsListResult, AfterSalesRequestsCreateResult, AfterSalesRequestsListResult, AfterSalesRequestsRetrieveResult, AfterSalesRequestsUpdateResult, AfterSalesReturnShipmentsCreateResult, AfterSalesReturnShipmentsListResult, ShopsCurrentApplicationsCreateResult, ShopsCurrentApplicationsListResult, ShopsCurrentBrandAuthorizationsListResult, ShopsCurrentBrandAuthorizationsUpsertResult, ShopsCurrentBusinessHoursRetrieveResult, ShopsCurrentBusinessHoursUpdateResult, ShopsCurrentCategoryBindingsListResult, ShopsCurrentCategoryBindingsUpsertResult, ShopsCurrentChannelsListResult, ShopsCurrentChannelsUpdateResult, ShopsCurrentCustomerServicesListResult, ShopsCurrentCustomerServicesUpsertResult, ShopsCurrentDashboardRetrieveResult, ShopsCurrentDepositAccountRetrieveResult, ShopsCurrentFulfillmentProfileRetrieveResult, ShopsCurrentFulfillmentProfileUpdateResult, ShopsCurrentInventoryStocksAdjustmentsCreateResult, ShopsCurrentInventoryStocksListResult, ShopsCurrentOrdersFulfillmentsCreateResult, ShopsCurrentOrdersListResult, ShopsCurrentOrdersRetrieveResult, ShopsCurrentPoliciesListResult, ShopsCurrentPoliciesUpdateResult, ShopsCurrentProductsCreateResult, ShopsCurrentProductsListResult, ShopsCurrentProductsPublishResult, ShopsCurrentProductsUnpublishResult, ShopsCurrentProductsUpdateResult, ShopsCurrentQualificationsListResult, ShopsCurrentQualificationsUpsertResult, ShopsCurrentReadinessRetrieveResult, ShopsCurrentRetrieveResult, ShopsCurrentReturnAddressesListResult, ShopsCurrentReturnAddressesUpsertResult, ShopsCurrentRiskSignalsListResult, ShopsCurrentServiceAreasCreateResult, ShopsCurrentServiceAreasListResult, ShopsCurrentServiceAreasUpdateResult, ShopsCurrentSettlementProfileRetrieveResult, ShopsCurrentSettlementProfileUpdateResult, ShopsCurrentSettlementsListResult, ShopsCurrentShippingTemplatesListResult, ShopsCurrentShippingTemplatesUpsertResult, ShopsCurrentStatusEventsListResult, ShopsCurrentVerificationsListResult, ShopsListResult, ShopsRetrieveResult, SiteRuntimeRetrieveResult

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"

def serialize_path_parameter(value: Any, spec: Dict[str, Any]) -> str:
    if value is None:
        return ''

    style = str(spec.get('style') or 'simple')
    name = str(spec.get('name') or '')
    explode = bool(spec.get('explode'))
    if isinstance(value, (list, tuple)):
        return serialize_path_array(name, value, style, explode)
    if isinstance(value, dict):
        return serialize_path_object(name, value, style, explode)
    return path_prefix(name, style) + encode_path_value(serialize_path_primitive(value))


def serialize_path_array(name: str, values: Any, style: str, explode: bool) -> str:
    serialized = [encode_path_value(serialize_path_primitive(item)) for item in values if item is not None]
    if not serialized:
        return path_prefix(name, style)
    if style == 'matrix':
        return ''.join(f";{name}={item}" for item in serialized) if explode else f";{name}={','.join(serialized)}"
    return path_prefix(name, style) + ('.' if explode else ',').join(serialized)


def serialize_path_object(name: str, value: Dict[str, Any], style: str, explode: bool) -> str:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if not entries:
        return path_prefix(name, style)
    if style == 'matrix':
        if explode:
            return ''.join(f";{encode_path_value(str(key))}={encode_path_value(serialize_path_primitive(entry_value))}" for key, entry_value in entries)
        serialized = ','.join(item for key, entry_value in entries for item in (encode_path_value(str(key)), encode_path_value(serialize_path_primitive(entry_value))))
        return f";{name}={serialized}"
    if explode:
        separator = '.' if style == 'label' else ','
        serialized = separator.join(f"{encode_path_value(str(key))}={encode_path_value(serialize_path_primitive(entry_value))}" for key, entry_value in entries)
    else:
        serialized = ','.join(item for key, entry_value in entries for item in (encode_path_value(str(key)), encode_path_value(serialize_path_primitive(entry_value))))
    return path_prefix(name, style) + serialized


def path_prefix(name: str, style: str) -> str:
    if style == 'label':
        return '.'
    if style == 'matrix':
        return f";{name}"
    return ''


def encode_path_value(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe='')


def serialize_path_primitive(value: Any) -> str:
    if isinstance(value, dict):
        import json

        return json.dumps(value, separators=(',', ':'))
    return str(value)





class SystemApi:
    """system system API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.after_sales = SystemAfterSalesApi(client)
        self.shops = SystemShopsApi(client)
        self.site = SystemSiteApi(client)


class SystemAfterSalesApi:
    """system system.after_sales API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.requests = SystemAfterSalesRequestsApi(client)
        self.events = SystemAfterSalesEventsApi(client)
        self.return_shipments = SystemAfterSalesReturnShipmentsApi(client)


class SystemAfterSalesRequestsApi:
    """system system.after_sales.requests API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> AfterSalesRequestsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/after_sales/requests")

    def retrieve(self, after_sales_request_id: str) -> AfterSalesRequestsRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/after_sales/requests/{serialize_path_parameter(after_sales_request_id, {'name': 'afterSalesRequestId', 'style': 'simple', 'explode': False})}")

    def create(self) -> AfterSalesRequestsCreateResult:
        """Create"""
        return self._client.post(f"/app/v3/api/system/after_sales/requests")

    def update(self, after_sales_request_id: str) -> AfterSalesRequestsUpdateResult:
        """Update"""
        return self._client.patch(f"/app/v3/api/system/after_sales/requests/{serialize_path_parameter(after_sales_request_id, {'name': 'afterSalesRequestId', 'style': 'simple', 'explode': False})}")

class SystemAfterSalesEventsApi:
    """system system.after_sales.events API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, after_sales_request_id: str) -> AfterSalesEventsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/after_sales/requests/{serialize_path_parameter(after_sales_request_id, {'name': 'afterSalesRequestId', 'style': 'simple', 'explode': False})}/events")

class SystemAfterSalesReturnShipmentsApi:
    """system system.after_sales.return_shipments API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, after_sales_request_id: str) -> AfterSalesReturnShipmentsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/after_sales/requests/{serialize_path_parameter(after_sales_request_id, {'name': 'afterSalesRequestId', 'style': 'simple', 'explode': False})}/return_shipments")

    def create(self, after_sales_request_id: str) -> AfterSalesReturnShipmentsCreateResult:
        """Create"""
        return self._client.post(f"/app/v3/api/system/after_sales/requests/{serialize_path_parameter(after_sales_request_id, {'name': 'afterSalesRequestId', 'style': 'simple', 'explode': False})}/return_shipments")

class SystemShopsApi:
    """system system.shops API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.current = SystemShopsCurrentApi(client)


    def list(self) -> ShopsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops")

    def retrieve(self, shop_id: str) -> ShopsRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}")

class SystemShopsCurrentApi:
    """system system.shops.current API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.applications = SystemShopsCurrentApplicationsApi(client)
        self.brand_authorizations = SystemShopsCurrentBrandAuthorizationsApi(client)
        self.business_hours = SystemShopsCurrentBusinessHoursApi(client)
        self.category_bindings = SystemShopsCurrentCategoryBindingsApi(client)
        self.channels = SystemShopsCurrentChannelsApi(client)
        self.customer_services = SystemShopsCurrentCustomerServicesApi(client)
        self.dashboard = SystemShopsCurrentDashboardApi(client)
        self.deposit_account = SystemShopsCurrentDepositAccountApi(client)
        self.fulfillment_profile = SystemShopsCurrentFulfillmentProfileApi(client)
        self.inventory = SystemShopsCurrentInventoryApi(client)
        self.orders = SystemShopsCurrentOrdersApi(client)
        self.policies = SystemShopsCurrentPoliciesApi(client)
        self.products = SystemShopsCurrentProductsApi(client)
        self.qualifications = SystemShopsCurrentQualificationsApi(client)
        self.readiness = SystemShopsCurrentReadinessApi(client)
        self.return_addresses = SystemShopsCurrentReturnAddressesApi(client)
        self.risk_signals = SystemShopsCurrentRiskSignalsApi(client)
        self.service_areas = SystemShopsCurrentServiceAreasApi(client)
        self.settlement_profile = SystemShopsCurrentSettlementProfileApi(client)
        self.settlements = SystemShopsCurrentSettlementsApi(client)
        self.shipping_templates = SystemShopsCurrentShippingTemplatesApi(client)
        self.status_events = SystemShopsCurrentStatusEventsApi(client)
        self.verifications = SystemShopsCurrentVerificationsApi(client)


    def retrieve(self) -> ShopsCurrentRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/shops/current")

class SystemShopsCurrentApplicationsApi:
    """system system.shops.current.applications API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentApplicationsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/applications")

    def create(self) -> ShopsCurrentApplicationsCreateResult:
        """Create"""
        return self._client.post(f"/app/v3/api/system/shops/current/applications")

class SystemShopsCurrentBrandAuthorizationsApi:
    """system system.shops.current.brand_authorizations API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentBrandAuthorizationsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/brand_authorizations")

    def upsert(self) -> ShopsCurrentBrandAuthorizationsUpsertResult:
        """Upsert"""
        return self._client.put(f"/app/v3/api/system/shops/current/brand_authorizations")

class SystemShopsCurrentBusinessHoursApi:
    """system system.shops.current.business_hours API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> ShopsCurrentBusinessHoursRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/shops/current/business_hours")

    def update(self) -> ShopsCurrentBusinessHoursUpdateResult:
        """Update"""
        return self._client.patch(f"/app/v3/api/system/shops/current/business_hours")

class SystemShopsCurrentCategoryBindingsApi:
    """system system.shops.current.category_bindings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentCategoryBindingsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/category_bindings")

    def upsert(self) -> ShopsCurrentCategoryBindingsUpsertResult:
        """Upsert"""
        return self._client.put(f"/app/v3/api/system/shops/current/category_bindings")

class SystemShopsCurrentChannelsApi:
    """system system.shops.current.channels API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentChannelsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/channels")

    def update(self, channel_id: str) -> ShopsCurrentChannelsUpdateResult:
        """Update"""
        return self._client.patch(f"/app/v3/api/system/shops/current/channels/{serialize_path_parameter(channel_id, {'name': 'channelId', 'style': 'simple', 'explode': False})}")

class SystemShopsCurrentCustomerServicesApi:
    """system system.shops.current.customer_services API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentCustomerServicesListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/customer_services")

    def upsert(self) -> ShopsCurrentCustomerServicesUpsertResult:
        """Upsert"""
        return self._client.put(f"/app/v3/api/system/shops/current/customer_services")

class SystemShopsCurrentDashboardApi:
    """system system.shops.current.dashboard API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> ShopsCurrentDashboardRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/shops/current/dashboard")

class SystemShopsCurrentDepositAccountApi:
    """system system.shops.current.deposit_account API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> ShopsCurrentDepositAccountRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/shops/current/deposit_account")

class SystemShopsCurrentFulfillmentProfileApi:
    """system system.shops.current.fulfillment_profile API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> ShopsCurrentFulfillmentProfileRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/shops/current/fulfillment_profile")

    def update(self) -> ShopsCurrentFulfillmentProfileUpdateResult:
        """Update"""
        return self._client.patch(f"/app/v3/api/system/shops/current/fulfillment_profile")

class SystemShopsCurrentInventoryApi:
    """system system.shops.current.inventory API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.stocks = SystemShopsCurrentInventoryStocksApi(client)


class SystemShopsCurrentInventoryStocksApi:
    """system system.shops.current.inventory.stocks API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.adjustments = SystemShopsCurrentInventoryStocksAdjustmentsApi(client)


    def list(self) -> ShopsCurrentInventoryStocksListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/inventory/stocks")

class SystemShopsCurrentInventoryStocksAdjustmentsApi:
    """system system.shops.current.inventory.stocks.adjustments API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, stock_id: str) -> ShopsCurrentInventoryStocksAdjustmentsCreateResult:
        """Create"""
        return self._client.post(f"/app/v3/api/system/shops/current/inventory/stocks/{serialize_path_parameter(stock_id, {'name': 'stockId', 'style': 'simple', 'explode': False})}/adjustments")

class SystemShopsCurrentOrdersApi:
    """system system.shops.current.orders API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.fulfillments = SystemShopsCurrentOrdersFulfillmentsApi(client)


    def list(self) -> ShopsCurrentOrdersListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/orders")

    def retrieve(self, order_id: str) -> ShopsCurrentOrdersRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/shops/current/orders/{serialize_path_parameter(order_id, {'name': 'orderId', 'style': 'simple', 'explode': False})}")

class SystemShopsCurrentOrdersFulfillmentsApi:
    """system system.shops.current.orders.fulfillments API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, order_id: str) -> ShopsCurrentOrdersFulfillmentsCreateResult:
        """Create"""
        return self._client.post(f"/app/v3/api/system/shops/current/orders/{serialize_path_parameter(order_id, {'name': 'orderId', 'style': 'simple', 'explode': False})}/fulfillments")

class SystemShopsCurrentPoliciesApi:
    """system system.shops.current.policies API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentPoliciesListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/policies")

    def update(self, policy_id: str) -> ShopsCurrentPoliciesUpdateResult:
        """Update"""
        return self._client.patch(f"/app/v3/api/system/shops/current/policies/{serialize_path_parameter(policy_id, {'name': 'policyId', 'style': 'simple', 'explode': False})}")

class SystemShopsCurrentProductsApi:
    """system system.shops.current.products API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentProductsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/products")

    def create(self) -> ShopsCurrentProductsCreateResult:
        """Create"""
        return self._client.post(f"/app/v3/api/system/shops/current/products")

    def update(self, product_id: str) -> ShopsCurrentProductsUpdateResult:
        """Update"""
        return self._client.patch(f"/app/v3/api/system/shops/current/products/{serialize_path_parameter(product_id, {'name': 'productId', 'style': 'simple', 'explode': False})}")

    def publish(self, product_id: str) -> ShopsCurrentProductsPublishResult:
        """Publish"""
        return self._client.post(f"/app/v3/api/system/shops/current/products/{serialize_path_parameter(product_id, {'name': 'productId', 'style': 'simple', 'explode': False})}/publish")

    def unpublish(self, product_id: str) -> ShopsCurrentProductsUnpublishResult:
        """Unpublish"""
        return self._client.post(f"/app/v3/api/system/shops/current/products/{serialize_path_parameter(product_id, {'name': 'productId', 'style': 'simple', 'explode': False})}/unpublish")

class SystemShopsCurrentQualificationsApi:
    """system system.shops.current.qualifications API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentQualificationsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/qualifications")

    def upsert(self) -> ShopsCurrentQualificationsUpsertResult:
        """Upsert"""
        return self._client.put(f"/app/v3/api/system/shops/current/qualifications")

class SystemShopsCurrentReadinessApi:
    """system system.shops.current.readiness API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> ShopsCurrentReadinessRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/shops/current/readiness")

class SystemShopsCurrentReturnAddressesApi:
    """system system.shops.current.return_addresses API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentReturnAddressesListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/return_addresses")

    def upsert(self) -> ShopsCurrentReturnAddressesUpsertResult:
        """Upsert"""
        return self._client.put(f"/app/v3/api/system/shops/current/return_addresses")

class SystemShopsCurrentRiskSignalsApi:
    """system system.shops.current.risk_signals API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentRiskSignalsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/risk_signals")

class SystemShopsCurrentServiceAreasApi:
    """system system.shops.current.service_areas API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentServiceAreasListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/service_areas")

    def create(self) -> ShopsCurrentServiceAreasCreateResult:
        """Create"""
        return self._client.post(f"/app/v3/api/system/shops/current/service_areas")

    def update(self, service_area_id: str) -> ShopsCurrentServiceAreasUpdateResult:
        """Update"""
        return self._client.patch(f"/app/v3/api/system/shops/current/service_areas/{serialize_path_parameter(service_area_id, {'name': 'serviceAreaId', 'style': 'simple', 'explode': False})}")

class SystemShopsCurrentSettlementProfileApi:
    """system system.shops.current.settlement_profile API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> ShopsCurrentSettlementProfileRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/shops/current/settlement_profile")

    def update(self) -> ShopsCurrentSettlementProfileUpdateResult:
        """Update"""
        return self._client.patch(f"/app/v3/api/system/shops/current/settlement_profile")

class SystemShopsCurrentSettlementsApi:
    """system system.shops.current.settlements API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentSettlementsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/settlements")

class SystemShopsCurrentShippingTemplatesApi:
    """system system.shops.current.shipping_templates API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentShippingTemplatesListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/shipping_templates")

    def upsert(self) -> ShopsCurrentShippingTemplatesUpsertResult:
        """Upsert"""
        return self._client.put(f"/app/v3/api/system/shops/current/shipping_templates")

class SystemShopsCurrentStatusEventsApi:
    """system system.shops.current.status_events API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentStatusEventsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/status_events")

class SystemShopsCurrentVerificationsApi:
    """system system.shops.current.verifications API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ShopsCurrentVerificationsListResult:
        """List"""
        return self._client.get(f"/app/v3/api/shops/current/verifications")

class SystemSiteApi:
    """system system.site API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.runtime = SystemSiteRuntimeApi(client)


class SystemSiteRuntimeApi:
    """system system.site.runtime API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> SiteRuntimeRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/app/v3/api/system/site/runtime")
