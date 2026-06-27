from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import ChannelGroupsListResult, DashboardOverviewRetrieveResult, GatewayTracesListResult, ModelRankingsListResult, ModelsListResult, ModelVendorsListResult, RoutingApiKeysListResult, RoutingChannelsListResult, RoutingRequestTracesListResult, RoutingUsageListResult, UsageLogsListResult

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"


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



class AiApi:
    """ai ai API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.channel_groups = AiChannelGroupsApi(client)
        self.dashboard = AiDashboardApi(client)
        self.gateway = AiGatewayApi(client)
        self.model_rankings = AiModelRankingsApi(client)
        self.model_vendors = AiModelVendorsApi(client)
        self.models = AiModelsApi(client)
        self.routing = AiRoutingApi(client)
        self.usage = AiUsageApi(client)


class AiChannelGroupsApi:
    """ai ai.channel_groups API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ChannelGroupsListResult:
        """List groups"""
        return self._client.get(f"/app/v3/api/ai/channel_groups")

class AiDashboardApi:
    """ai ai.dashboard API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.overview = AiDashboardOverviewApi(client)


class AiDashboardOverviewApi:
    """ai ai.dashboard.overview API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self, time_range: Optional[str] = None, start_time: Optional[str] = None, end_time: Optional[str] = None) -> DashboardOverviewRetrieveResult:
        """List dashboard overview"""
        query = build_query_string([
            {'name': 'time_range', 'value': time_range, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/ai/dashboard/overview", query))

class AiGatewayApi:
    """ai ai.gateway API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.traces = AiGatewayTracesApi(client)


class AiGatewayTracesApi:
    """ai ai.gateway.traces API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> GatewayTracesListResult:
        """List traces"""
        return self._client.get(f"/app/v3/api/ai/gateway/traces")

class AiModelRankingsApi:
    """ai ai.model_rankings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, rank_scope: Optional[str] = None, vendor_code: Optional[str] = None, modality: Optional[str] = None, q: Optional[str] = None, limit: Optional[str] = None) -> ModelRankingsListResult:
        """List model rankings"""
        query = build_query_string([
            {'name': 'rank_scope', 'value': rank_scope, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'vendor_code', 'value': vendor_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'modality', 'value': modality, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/ai/model_rankings", query))

class AiModelVendorsApi:
    """ai ai.model_vendors API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ModelVendorsListResult:
        """List ranking vendor filters"""
        return self._client.get(f"/app/v3/api/ai/model_vendors")

class AiModelsApi:
    """ai ai.models API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, billing_meter: Optional[str] = None, vendor_code: Optional[str] = None, vendor_codes: Optional[List[str]] = None, modalities: Optional[List[str]] = None, capabilities: Optional[List[str]] = None, categories: Optional[List[str]] = None, groups: Optional[List[str]] = None, q: Optional[str] = None, limit: Optional[str] = None, offset: Optional[str] = None) -> ModelsListResult:
        """List model catalog for Playground"""
        query = build_query_string([
            {'name': 'billing_meter', 'value': billing_meter, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'vendor_code', 'value': vendor_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'vendor_codes', 'value': vendor_codes, 'style': 'form', 'explode': False, 'allow_reserved': False},
            {'name': 'modalities', 'value': modalities, 'style': 'form', 'explode': False, 'allow_reserved': False},
            {'name': 'capabilities', 'value': capabilities, 'style': 'form', 'explode': False, 'allow_reserved': False},
            {'name': 'categories', 'value': categories, 'style': 'form', 'explode': False, 'allow_reserved': False},
            {'name': 'groups', 'value': groups, 'style': 'form', 'explode': False, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'offset', 'value': offset, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/ai/models", query))

class AiRoutingApi:
    """ai ai.routing API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.api_keys = AiRoutingApiKeysApi(client)
        self.channels = AiRoutingChannelsApi(client)
        self.request_traces = AiRoutingRequestTracesApi(client)
        self.usage = AiRoutingUsageApi(client)


class AiRoutingApiKeysApi:
    """ai ai.routing.api_keys API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> RoutingApiKeysListResult:
        """List routing API keys"""
        return self._client.get(f"/app/v3/api/ai/routing/api_keys")

class AiRoutingChannelsApi:
    """ai ai.routing.channels API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> RoutingChannelsListResult:
        """List routing channels"""
        return self._client.get(f"/app/v3/api/ai/routing/channels")

class AiRoutingRequestTracesApi:
    """ai ai.routing.request_traces API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> RoutingRequestTracesListResult:
        """List routing request traces"""
        return self._client.get(f"/app/v3/api/ai/routing/request_traces")

class AiRoutingUsageApi:
    """ai ai.routing.usage API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> RoutingUsageListResult:
        """List routing usage"""
        return self._client.get(f"/app/v3/api/ai/routing/usage")

class AiUsageApi:
    """ai ai.usage API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.logs = AiUsageLogsApi(client)


class AiUsageLogsApi:
    """ai ai.usage.logs API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, q: Optional[str] = None, status: Optional[str] = None, start_time: Optional[str] = None, end_time: Optional[str] = None) -> UsageLogsListResult:
        """List logs"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/app/v3/api/ai/usage/logs", query))
