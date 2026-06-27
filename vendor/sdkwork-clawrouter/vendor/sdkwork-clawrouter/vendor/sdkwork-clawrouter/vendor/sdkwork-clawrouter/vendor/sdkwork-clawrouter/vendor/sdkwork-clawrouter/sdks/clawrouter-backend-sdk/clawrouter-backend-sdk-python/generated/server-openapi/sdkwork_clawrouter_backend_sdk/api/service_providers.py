from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import AdjustmentsListResult, AuditEventsListResult, BindingsListResult, ContractsListResult, DashboardRetrieveResult, DownstreamsCreateResult, DownstreamsListResult, MembersListResult, PriceSimulationCreateResult, PricingRulesCreateResult, PricingRulesListResult, PricingRulesUpdateResult, ProviderRegistryListResult, ProviderWalletAccountsListResult, ReconciliationRunsListResult, RelationsListResult, RiskEventsListResult, ServiceProviderDownstreamCreateRequest, ServiceProviderPriceSimulationRequest, ServiceProviderPricingRuleCreateRequest, ServiceProviderPricingRuleUpdateRequest, StatementsListResult, UsageListResult

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

def build_request_headers(headers: Dict[str, Dict[str, Any]], cookies: Optional[Dict[str, Dict[str, Any]]] = None) -> Optional[Dict[str, str]]:
    request_headers: Dict[str, str] = {}
    for name, parameter in headers.items():
        serialized = serialize_parameter_value(parameter)
        if serialized is not None:
            request_headers[name] = serialized

    cookie_header = build_cookie_header(cookies or {})
    if cookie_header:
        request_headers['Cookie'] = (
            f"{request_headers['Cookie']}; {cookie_header}"
            if 'Cookie' in request_headers
            else cookie_header
        )

    return request_headers or None


def build_cookie_header(cookies: Dict[str, Dict[str, Any]]) -> Optional[str]:
    from urllib.parse import quote

    pairs: List[str] = []
    for name, parameter in cookies.items():
        serialized = serialize_parameter_value(parameter)
        if serialized is not None:
            pairs.append(f"{quote(str(name), safe='')}={quote(serialized, safe='')}")
    return '; '.join(pairs) if pairs else None


def serialize_parameter_value(parameter: Optional[Dict[str, Any]]) -> Optional[str]:
    value = None if parameter is None else parameter.get('value')
    if value is None:
        return None
    if parameter and parameter.get('content_type'):
        import json

        return json.dumps(value, separators=(',', ':'))
    if isinstance(value, (list, tuple)):
        return ','.join(serialize_header_primitive(item) for item in value if item is not None)
    if isinstance(value, dict):
        return serialize_header_object(value, bool(parameter and parameter.get('explode')))
    return serialize_header_primitive(value)


def serialize_header_object(value: Dict[str, Any], explode: bool) -> str:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if explode:
        return ','.join(f"{key}={serialize_header_primitive(entry_value)}" for key, entry_value in entries)
    return ','.join(item for key, entry_value in entries for item in (str(key), serialize_header_primitive(entry_value)))


def serialize_header_primitive(value: Any) -> str:
    return str(value)


class ServiceProvidersApi:
    """service_providers service_providers API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.adjustments = ServiceProvidersAdjustmentsApi(client)
        self.audit_events = ServiceProvidersAuditEventsApi(client)
        self.bindings = ServiceProvidersBindingsApi(client)
        self.contracts = ServiceProvidersContractsApi(client)
        self.dashboard = ServiceProvidersDashboardApi(client)
        self.downstreams = ServiceProvidersDownstreamsApi(client)
        self.members = ServiceProvidersMembersApi(client)
        self.pricing_rules = ServiceProvidersPricingRulesApi(client)
        self.price_simulation = ServiceProvidersPriceSimulationApi(client)
        self.provider_registry = ServiceProvidersProviderRegistryApi(client)
        self.reconciliation_runs = ServiceProvidersReconciliationRunsApi(client)
        self.relations = ServiceProvidersRelationsApi(client)
        self.risk_events = ServiceProvidersRiskEventsApi(client)
        self.statements = ServiceProvidersStatementsApi(client)
        self.usage = ServiceProvidersUsageApi(client)
        self.provider_wallet_accounts = ServiceProvidersProviderWalletAccountsApi(client)


class ServiceProvidersAdjustmentsApi:
    """service_providers service_providers.adjustments API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> AdjustmentsListResult:
        """Service Provider Adjustments List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/adjustments", query))

class ServiceProvidersAuditEventsApi:
    """service_providers service_providers.audit_events API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> AuditEventsListResult:
        """Service Provider Audit Events List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/audit/events", query))

class ServiceProvidersBindingsApi:
    """service_providers service_providers.bindings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> BindingsListResult:
        """Service Provider Bindings List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/bindings", query))

class ServiceProvidersContractsApi:
    """service_providers service_providers.contracts API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> ContractsListResult:
        """Service Provider Contracts List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/contracts", query))

class ServiceProvidersDashboardApi:
    """service_providers service_providers.dashboard API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> DashboardRetrieveResult:
        """Service Provider Dashboard Retrieve"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/dashboard", query))

class ServiceProvidersDownstreamsApi:
    """service_providers service_providers.downstreams API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> DownstreamsListResult:
        """Service Provider Downstreams List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/downstreams", query))

    def create(self, body: ServiceProviderDownstreamCreateRequest, idempotency_key: str) -> DownstreamsCreateResult:
        """Service Provider Downstream Create"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/service_providers/downstreams", json=body, headers=request_headers)

class ServiceProvidersMembersApi:
    """service_providers service_providers.members API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> MembersListResult:
        """Service Provider Members List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/members", query))

class ServiceProvidersPricingRulesApi:
    """service_providers service_providers.pricing_rules API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> PricingRulesListResult:
        """Service Provider Pricing Rules List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/pricing/rules", query))

    def create(self, body: ServiceProviderPricingRuleCreateRequest, idempotency_key: str) -> PricingRulesCreateResult:
        """Service Provider Pricing Rule Create"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/service_providers/pricing/rules", json=body, headers=request_headers)

    def update(self, rule_id: str, body: ServiceProviderPricingRuleUpdateRequest, idempotency_key: str) -> PricingRulesUpdateResult:
        """Service Provider Pricing Rule Update"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.patch(f"/backend/v3/api/service_providers/pricing/rules/{serialize_path_parameter(rule_id, {'name': 'ruleId', 'style': 'simple', 'explode': False})}", json=body, headers=request_headers)

class ServiceProvidersPriceSimulationApi:
    """service_providers service_providers.price_simulation API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: ServiceProviderPriceSimulationRequest, idempotency_key: str) -> PriceSimulationCreateResult:
        """Service Provider Price Simulation Create"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/service_providers/pricing/simulations", json=body, headers=request_headers)

class ServiceProvidersProviderRegistryApi:
    """service_providers service_providers.provider_registry API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> ProviderRegistryListResult:
        """Service Providers List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/providers", query))

class ServiceProvidersReconciliationRunsApi:
    """service_providers service_providers.reconciliation_runs API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> ReconciliationRunsListResult:
        """Service Provider Reconciliation Runs List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/reconciliation_runs", query))

class ServiceProvidersRelationsApi:
    """service_providers service_providers.relations API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> RelationsListResult:
        """Service Provider Relations List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/relations", query))

class ServiceProvidersRiskEventsApi:
    """service_providers service_providers.risk_events API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> RiskEventsListResult:
        """Service Provider Risk Events List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/risk/events", query))

class ServiceProvidersStatementsApi:
    """service_providers service_providers.statements API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> StatementsListResult:
        """Service Provider Statements List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/statements", query))

class ServiceProvidersUsageApi:
    """service_providers service_providers.usage API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> UsageListResult:
        """Service Provider Usage List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/usage", query))

class ServiceProvidersProviderWalletAccountsApi:
    """service_providers service_providers.provider_wallet_accounts API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, provider_id: Optional[str] = None, seller_provider_id: Optional[str] = None, buyer_provider_id: Optional[str] = None, edge_id: Optional[str] = None) -> ProviderWalletAccountsListResult:
        """Service Provider Wallet Accounts List"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_id', 'value': provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'seller_provider_id', 'value': seller_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'buyer_provider_id', 'value': buyer_provider_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'edge_id', 'value': edge_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/service_providers/wallet/accounts", query))
