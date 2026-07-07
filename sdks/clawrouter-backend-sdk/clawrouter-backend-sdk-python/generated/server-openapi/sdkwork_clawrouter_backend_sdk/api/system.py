from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import AfterSalesReviewsCreateResult, AnalyticsAdminOverviewRetrieveResult, AuthSettingsRetrieveResult, AuthSettingsUpdateResult, CacheInstancesDeleteResult, CacheInstancesRefreshCreateResult, CacheNamespacesDeleteResult, CacheNamespacesKeysDeleteResult, CacheNamespacesKeysListResult, CacheNamespacesRefreshCreateResult, CacheOverviewRetrieveResult, CacheRefreshCreateResult, DashboardAdminOverviewRetrieveResult, FirewallsRulesCreateResult, FirewallsRulesDeleteResult, FirewallsRulesListResult, InstallationStatusRetrieveResult, MarketingReferralStatsListResult, MonitorAlertsListResult, MonitorNodesListResult, MonitorPerformanceListResult, RateLimitsApiKeysCreateResult, RateLimitsApiKeysListResult, RateLimitsIpCreateResult, RateLimitsIpListResult, RateLimitsModelsCreateResult, RateLimitsModelsListResult, RecordsListResult, RuntimeRegionSettingsRetrieveResult, RuntimeRegionSettingsUpdateResult, ServiceNodesCreateResult, ServiceNodesDeleteResult, ServiceNodesListResult, ServiceNodesStatusUpdateResult, ServiceNodesUpdateResult, ShopsApproveResult, ShopsBrandAuthorizationsUpsertResult, ShopsBusinessHoursUpdateResult, ShopsCategoryBindingsUpsertResult, ShopsChannelsCreateResult, ShopsChannelsUpdateResult, ShopsCloseResult, ShopsCreateResult, ShopsCustomerServicesUpsertResult, ShopsDepositAccountReviewResult, ShopsDepositAccountUpdateResult, ShopsFulfillmentProfileUpdateResult, ShopsPoliciesCreateResult, ShopsPoliciesUpdateResult, ShopsQualificationsUpsertResult, ShopsRejectResult, ShopsResumeResult, ShopsReturnAddressesUpsertResult, ShopsRiskSignalsCreateResult, ShopsRiskSignalsResolveResult, ShopsServiceAreasCreateResult, ShopsServiceAreasUpdateResult, ShopsSettlementProfileApproveResult, ShopsSettlementProfileRejectResult, ShopsSettlementProfileUpdateResult, ShopsShippingTemplatesUpsertResult, ShopsSubmitReviewResult, ShopsSuspendResult, ShopsUpdateResult, ShopsVerificationsUpdateResult, SiteSettingsRetrieveResult, SiteSettingsUpdateResult

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


def build_query_string(parameters: List[Dict[str, Any]]) -> str:
    pairs: List[str] = []
    for parameter in parameters:
        append_serialized_parameter(pairs, parameter)
    return '&'.join(pairs)


def append_serialized_parameter(pairs: List[str], parameter: Dict[str, Any]) -> None:
    value = parameter.get('value')
    if value is None:
        return

    name = str(parameter.get('name') or '')
    allow_reserved = bool(parameter.get('allow_reserved'))
    content_type = parameter.get('content_type')
    if content_type:
        import json

        pairs.append(f"{encode_query_component(name)}={encode_query_value(json.dumps(value, separators=(',', ':')), allow_reserved)}")
        return

    style = str(parameter.get('style') or 'form')
    explode = bool(parameter.get('explode'))
    if style == 'deepObject':
        append_deep_object_parameter(pairs, name, value, allow_reserved)
        return
    if isinstance(value, (list, tuple)):
        append_array_parameter(pairs, name, value, style, explode, allow_reserved)
        return
    if isinstance(value, dict):
        append_object_parameter(pairs, name, value, style, explode, allow_reserved)
        return

    pairs.append(f"{encode_query_component(name)}={encode_query_value(serialize_primitive(value), allow_reserved)}")


def append_array_parameter(
    pairs: List[str],
    name: str,
    value: Any,
    style: str,
    explode: bool,
    allow_reserved: bool,
) -> None:
    values = [serialize_primitive(item) for item in value if item is not None]
    if not values:
        return

    if style == 'form' and explode:
        for item in values:
            pairs.append(f"{encode_query_component(name)}={encode_query_value(item, allow_reserved)}")
        return

    pairs.append(f"{encode_query_component(name)}={encode_query_value(','.join(values), allow_reserved)}")


def append_object_parameter(
    pairs: List[str],
    name: str,
    value: Dict[str, Any],
    style: str,
    explode: bool,
    allow_reserved: bool,
) -> None:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if not entries:
        return

    if style == 'form' and explode:
        for key, entry_value in entries:
            pairs.append(f"{encode_query_component(str(key))}={encode_query_value(serialize_primitive(entry_value), allow_reserved)}")
        return

    serialized = ','.join(
        item
        for key, entry_value in entries
        for item in (str(key), serialize_primitive(entry_value))
    )
    pairs.append(f"{encode_query_component(name)}={encode_query_value(serialized, allow_reserved)}")


def append_deep_object_parameter(pairs: List[str], name: str, value: Any, allow_reserved: bool) -> None:
    if not isinstance(value, dict):
        pairs.append(f"{encode_query_component(name)}={encode_query_value(serialize_primitive(value), allow_reserved)}")
        return

    for key, entry_value in value.items():
        if entry_value is None:
            continue
        pairs.append(f"{encode_query_component(f'{name}[{key}]')}={encode_query_value(serialize_primitive(entry_value), allow_reserved)}")


def serialize_primitive(value: Any) -> str:
    if isinstance(value, dict):
        import json

        return json.dumps(value, separators=(',', ':'))
    return str(value)


def encode_query_component(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe='')


def encode_query_value(value: str, allow_reserved: bool) -> str:
    from urllib.parse import quote

    return quote(value, safe=':/?#[]@!$&\'()*+,;=' if allow_reserved else '')



class SystemApi:
    """system system API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.after_sales = SystemAfterSalesApi(client)
        self.analytics = SystemAnalyticsApi(client)
        self.auth = SystemAuthApi(client)
        self.cache = SystemCacheApi(client)
        self.dashboard = SystemDashboardApi(client)
        self.firewalls = SystemFirewallsApi(client)
        self.installation = SystemInstallationApi(client)
        self.marketing = SystemMarketingApi(client)
        self.monitor = SystemMonitorApi(client)
        self.rate_limits = SystemRateLimitsApi(client)
        self.records = SystemRecordsApi(client)
        self.runtime_region = SystemRuntimeRegionApi(client)
        self.service_nodes = SystemServiceNodesApi(client)
        self.shops = SystemShopsApi(client)
        self.site = SystemSiteApi(client)


class SystemAfterSalesApi:
    """system system.after_sales API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.reviews = SystemAfterSalesReviewsApi(client)


class SystemAfterSalesReviewsApi:
    """system system.after_sales.reviews API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, after_sales_request_id: str) -> AfterSalesReviewsCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/after_sales/requests/{serialize_path_parameter(after_sales_request_id, {'name': 'afterSalesRequestId', 'style': 'simple', 'explode': False})}/reviews")

class SystemAnalyticsApi:
    """system system.analytics API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.admin = SystemAnalyticsAdminApi(client)


class SystemAnalyticsAdminApi:
    """system system.analytics.admin API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.overview = SystemAnalyticsAdminOverviewApi(client)


class SystemAnalyticsAdminOverviewApi:
    """system system.analytics.admin.overview API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self, time_range: Optional[str] = None, start_time: Optional[str] = None, end_time: Optional[str] = None, ranking_size: Optional[int] = None) -> AnalyticsAdminOverviewRetrieveResult:
        """Retrieve"""
        query = build_query_string([
            {'name': 'time_range', 'value': time_range, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'ranking_size', 'value': ranking_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/system/analytics/admin/overview", query))

class SystemAuthApi:
    """system system.auth API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.settings = SystemAuthSettingsApi(client)


class SystemAuthSettingsApi:
    """system system.auth.settings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> AuthSettingsRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/backend/v3/api/system/auth/settings")

    def update(self) -> AuthSettingsUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/auth/settings")

class SystemCacheApi:
    """system system.cache API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.instances = SystemCacheInstancesApi(client)
        self.namespaces = SystemCacheNamespacesApi(client)
        self.overview = SystemCacheOverviewApi(client)
        self.refresh = SystemCacheRefreshApi(client)


class SystemCacheInstancesApi:
    """system system.cache.instances API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.refresh = SystemCacheInstancesRefreshApi(client)


    def delete(self, instance_name: str) -> CacheInstancesDeleteResult:
        """Delete"""
        return self._client.delete(f"/backend/v3/api/system/cache/instances/{serialize_path_parameter(instance_name, {'name': 'instanceName', 'style': 'simple', 'explode': False})}")

class SystemCacheInstancesRefreshApi:
    """system system.cache.instances.refresh API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, instance_name: str) -> CacheInstancesRefreshCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/cache/instances/{serialize_path_parameter(instance_name, {'name': 'instanceName', 'style': 'simple', 'explode': False})}/refresh")

class SystemCacheNamespacesApi:
    """system system.cache.namespaces API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.keys = SystemCacheNamespacesKeysApi(client)
        self.refresh = SystemCacheNamespacesRefreshApi(client)


    def delete(self, namespace: str) -> CacheNamespacesDeleteResult:
        """Delete"""
        return self._client.delete(f"/backend/v3/api/system/cache/namespaces/{serialize_path_parameter(namespace, {'name': 'namespace', 'style': 'simple', 'explode': False})}")

class SystemCacheNamespacesKeysApi:
    """system system.cache.namespaces.keys API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, namespace: str, page_size: Optional[int] = None, cursor: Optional[str] = None) -> CacheNamespacesKeysListResult:
        """List"""
        query = build_query_string([
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'cursor', 'value': cursor, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/system/cache/namespaces/{serialize_path_parameter(namespace, {'name': 'namespace', 'style': 'simple', 'explode': False})}/keys", query))

    def delete(self, namespace: str, key: str) -> CacheNamespacesKeysDeleteResult:
        """Delete"""
        return self._client.delete(f"/backend/v3/api/system/cache/namespaces/{serialize_path_parameter(namespace, {'name': 'namespace', 'style': 'simple', 'explode': False})}/keys/{serialize_path_parameter(key, {'name': 'key', 'style': 'simple', 'explode': False})}")

class SystemCacheNamespacesRefreshApi:
    """system system.cache.namespaces.refresh API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, namespace: str) -> CacheNamespacesRefreshCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/cache/namespaces/{serialize_path_parameter(namespace, {'name': 'namespace', 'style': 'simple', 'explode': False})}/refresh")

class SystemCacheOverviewApi:
    """system system.cache.overview API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> CacheOverviewRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/backend/v3/api/system/cache/overview")

class SystemCacheRefreshApi:
    """system system.cache.refresh API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self) -> CacheRefreshCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/cache/refresh")

class SystemDashboardApi:
    """system system.dashboard API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.admin = SystemDashboardAdminApi(client)


class SystemDashboardAdminApi:
    """system system.dashboard.admin API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.overview = SystemDashboardAdminOverviewApi(client)


class SystemDashboardAdminOverviewApi:
    """system system.dashboard.admin.overview API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> DashboardAdminOverviewRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/backend/v3/api/system/dashboard/admin/overview")

class SystemFirewallsApi:
    """system system.firewalls API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.rules = SystemFirewallsRulesApi(client)


class SystemFirewallsRulesApi:
    """system system.firewalls.rules API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> FirewallsRulesListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/firewalls/rules")

    def create(self) -> FirewallsRulesCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/firewalls/rules")

    def delete(self, rule_id: str) -> FirewallsRulesDeleteResult:
        """Delete"""
        return self._client.delete(f"/backend/v3/api/system/firewalls/rules/{serialize_path_parameter(rule_id, {'name': 'ruleId', 'style': 'simple', 'explode': False})}")

class SystemInstallationApi:
    """system system.installation API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.status = SystemInstallationStatusApi(client)


class SystemInstallationStatusApi:
    """system system.installation.status API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> InstallationStatusRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/backend/v3/api/system/installation/status")

class SystemMarketingApi:
    """system system.marketing API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.referral_stats = SystemMarketingReferralStatsApi(client)


class SystemMarketingReferralStatsApi:
    """system system.marketing.referral_stats API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> MarketingReferralStatsListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/marketing/referral_stats")

class SystemMonitorApi:
    """system system.monitor API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.alerts = SystemMonitorAlertsApi(client)
        self.nodes = SystemMonitorNodesApi(client)
        self.performance = SystemMonitorPerformanceApi(client)


class SystemMonitorAlertsApi:
    """system system.monitor.alerts API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> MonitorAlertsListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/monitor/alerts")

class SystemMonitorNodesApi:
    """system system.monitor.nodes API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> MonitorNodesListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/monitor/nodes")

class SystemMonitorPerformanceApi:
    """system system.monitor.performance API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> MonitorPerformanceListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/monitor/performance")

class SystemRateLimitsApi:
    """system system.rate_limits API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.api_keys = SystemRateLimitsApiKeysApi(client)
        self.ip = SystemRateLimitsIpApi(client)
        self.models = SystemRateLimitsModelsApi(client)


class SystemRateLimitsApiKeysApi:
    """system system.rate_limits.api_keys API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> RateLimitsApiKeysListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/rate_limits/api_keys")

    def create(self) -> RateLimitsApiKeysCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/rate_limits/api_keys")

class SystemRateLimitsIpApi:
    """system system.rate_limits.ip API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> RateLimitsIpListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/rate_limits/ip")

    def create(self) -> RateLimitsIpCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/rate_limits/ip")

class SystemRateLimitsModelsApi:
    """system system.rate_limits.models API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> RateLimitsModelsListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/rate_limits/models")

    def create(self) -> RateLimitsModelsCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/rate_limits/models")

class SystemRecordsApi:
    """system system.records API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> RecordsListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/records")

class SystemRuntimeRegionApi:
    """system system.runtime_region API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.settings = SystemRuntimeRegionSettingsApi(client)


class SystemRuntimeRegionSettingsApi:
    """system system.runtime_region.settings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> RuntimeRegionSettingsRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/backend/v3/api/system/runtime_region/settings")

    def update(self) -> RuntimeRegionSettingsUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/runtime_region/settings")

class SystemServiceNodesApi:
    """system system.service_nodes API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.status = SystemServiceNodesStatusApi(client)


    def list(self) -> ServiceNodesListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/system/service_nodes")

    def create(self) -> ServiceNodesCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/service_nodes")

    def delete(self, node_id: str) -> ServiceNodesDeleteResult:
        """Delete"""
        return self._client.delete(f"/backend/v3/api/system/service_nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}")

    def update(self, node_id: str) -> ServiceNodesUpdateResult:
        """Update"""
        return self._client.put(f"/backend/v3/api/system/service_nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}")

class SystemServiceNodesStatusApi:
    """system system.service_nodes.status API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def update(self, node_id: str) -> ServiceNodesStatusUpdateResult:
        """Update"""
        return self._client.put(f"/backend/v3/api/system/service_nodes/{serialize_path_parameter(node_id, {'name': 'nodeId', 'style': 'simple', 'explode': False})}/status")

class SystemShopsApi:
    """system system.shops API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.brand_authorizations = SystemShopsBrandAuthorizationsApi(client)
        self.business_hours = SystemShopsBusinessHoursApi(client)
        self.category_bindings = SystemShopsCategoryBindingsApi(client)
        self.channels = SystemShopsChannelsApi(client)
        self.customer_services = SystemShopsCustomerServicesApi(client)
        self.deposit_account = SystemShopsDepositAccountApi(client)
        self.fulfillment_profile = SystemShopsFulfillmentProfileApi(client)
        self.policies = SystemShopsPoliciesApi(client)
        self.qualifications = SystemShopsQualificationsApi(client)
        self.return_addresses = SystemShopsReturnAddressesApi(client)
        self.risk_signals = SystemShopsRiskSignalsApi(client)
        self.service_areas = SystemShopsServiceAreasApi(client)
        self.settlement_profile = SystemShopsSettlementProfileApi(client)
        self.shipping_templates = SystemShopsShippingTemplatesApi(client)
        self.verifications = SystemShopsVerificationsApi(client)


    def create(self) -> ShopsCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/shops")

    def update(self, shop_id: str) -> ShopsUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}")

    def approve(self, shop_id: str) -> ShopsApproveResult:
        """Approve"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/approve")

    def close(self, shop_id: str) -> ShopsCloseResult:
        """Close"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/close")

    def reject(self, shop_id: str) -> ShopsRejectResult:
        """Reject"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/reject")

    def resume(self, shop_id: str) -> ShopsResumeResult:
        """Resume"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/resume")

    def submit_review(self, shop_id: str) -> ShopsSubmitReviewResult:
        """Create review"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/submit_review")

    def suspend(self, shop_id: str) -> ShopsSuspendResult:
        """Suspend"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/suspend")

class SystemShopsBrandAuthorizationsApi:
    """system system.shops.brand_authorizations API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def upsert(self, shop_id: str) -> ShopsBrandAuthorizationsUpsertResult:
        """Upsert"""
        return self._client.put(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/brand_authorizations")

class SystemShopsBusinessHoursApi:
    """system system.shops.business_hours API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def update(self, shop_id: str) -> ShopsBusinessHoursUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/business_hours")

class SystemShopsCategoryBindingsApi:
    """system system.shops.category_bindings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def upsert(self, shop_id: str) -> ShopsCategoryBindingsUpsertResult:
        """Upsert"""
        return self._client.put(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/category_bindings")

class SystemShopsChannelsApi:
    """system system.shops.channels API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, shop_id: str) -> ShopsChannelsCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/channels")

    def update(self, shop_id: str, channel_id: str) -> ShopsChannelsUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/channels/{serialize_path_parameter(channel_id, {'name': 'channelId', 'style': 'simple', 'explode': False})}")

class SystemShopsCustomerServicesApi:
    """system system.shops.customer_services API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def upsert(self, shop_id: str) -> ShopsCustomerServicesUpsertResult:
        """Upsert"""
        return self._client.put(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/customer_services")

class SystemShopsDepositAccountApi:
    """system system.shops.deposit_account API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def update(self, shop_id: str) -> ShopsDepositAccountUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/deposit_account")

    def review(self, shop_id: str) -> ShopsDepositAccountReviewResult:
        """Review"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/deposit_account/review")

class SystemShopsFulfillmentProfileApi:
    """system system.shops.fulfillment_profile API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def update(self, shop_id: str) -> ShopsFulfillmentProfileUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/fulfillment_profile")

class SystemShopsPoliciesApi:
    """system system.shops.policies API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, shop_id: str) -> ShopsPoliciesCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/policies")

    def update(self, shop_id: str, policy_id: str) -> ShopsPoliciesUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/policies/{serialize_path_parameter(policy_id, {'name': 'policyId', 'style': 'simple', 'explode': False})}")

class SystemShopsQualificationsApi:
    """system system.shops.qualifications API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def upsert(self, shop_id: str) -> ShopsQualificationsUpsertResult:
        """Upsert"""
        return self._client.put(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/qualifications")

class SystemShopsReturnAddressesApi:
    """system system.shops.return_addresses API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def upsert(self, shop_id: str) -> ShopsReturnAddressesUpsertResult:
        """Upsert"""
        return self._client.put(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/return_addresses")

class SystemShopsRiskSignalsApi:
    """system system.shops.risk_signals API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, shop_id: str) -> ShopsRiskSignalsCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/risk_signals")

    def resolve(self, shop_id: str, risk_signal_id: str) -> ShopsRiskSignalsResolveResult:
        """Resolve"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/risk_signals/{serialize_path_parameter(risk_signal_id, {'name': 'riskSignalId', 'style': 'simple', 'explode': False})}/resolve")

class SystemShopsServiceAreasApi:
    """system system.shops.service_areas API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, shop_id: str) -> ShopsServiceAreasCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/service_areas")

    def update(self, shop_id: str, service_area_id: str) -> ShopsServiceAreasUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/service_areas/{serialize_path_parameter(service_area_id, {'name': 'serviceAreaId', 'style': 'simple', 'explode': False})}")

class SystemShopsSettlementProfileApi:
    """system system.shops.settlement_profile API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def update(self, shop_id: str) -> ShopsSettlementProfileUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/settlement_profile")

    def approve(self, shop_id: str) -> ShopsSettlementProfileApproveResult:
        """Approve"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/settlement_profile/approve")

    def reject(self, shop_id: str) -> ShopsSettlementProfileRejectResult:
        """Reject"""
        return self._client.post(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/settlement_profile/reject")

class SystemShopsShippingTemplatesApi:
    """system system.shops.shipping_templates API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def upsert(self, shop_id: str) -> ShopsShippingTemplatesUpsertResult:
        """Upsert"""
        return self._client.put(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/shipping_templates")

class SystemShopsVerificationsApi:
    """system system.shops.verifications API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def update(self, shop_id: str, verification_id: str) -> ShopsVerificationsUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/shops/{serialize_path_parameter(shop_id, {'name': 'shopId', 'style': 'simple', 'explode': False})}/verifications/{serialize_path_parameter(verification_id, {'name': 'verificationId', 'style': 'simple', 'explode': False})}")

class SystemSiteApi:
    """system system.site API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.settings = SystemSiteSettingsApi(client)


class SystemSiteSettingsApi:
    """system system.site.settings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self) -> SiteSettingsRetrieveResult:
        """Retrieve"""
        return self._client.get(f"/backend/v3/api/system/site/settings")

    def update(self) -> SiteSettingsUpdateResult:
        """Update"""
        return self._client.patch(f"/backend/v3/api/system/site/settings")
