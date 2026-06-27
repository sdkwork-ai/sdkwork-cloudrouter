from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import AdminAiModelCreateRequest, AdminAiModelUpdateRequest, AdminAiResourceCreateRequest, AdminAiResourceGroupCreateRequest, AdminAiResourceGroupUpdateRequest, AdminAiResourceUpdateRequest, AdminChannelGroupChannelBindingsReplaceRequest, AdminChannelGroupCreateRequest, AdminChannelGroupUpdateRequest, AdminModelCatalogSyncRequest, AdminModelMappingCreateRequest, AdminModelMappingResolveRequest, AdminModelMappingUpdateRequest, AdminModelVendorCreateRequest, AdminRuntimeRouteExplainRequest, AiResourceGroupsCreateResult, AiResourceGroupsDeleteResult, AiResourceGroupsListResult, AiResourceGroupsResourcesListResult, AiResourceGroupsUpdateResult, AiResourcesCreateResult, AiResourcesListResult, AiResourcesUpdateResult, ChannelGroupsChannelBindingsListResult, ChannelGroupsChannelBindingsUpdateResult, ChannelGroupsCreateResult, ChannelGroupsDeleteResult, ChannelGroupsListResult, ChannelGroupsRouteExplainRetrieveResult, ChannelGroupsUpdateResult, ModelMappingsCreateResult, ModelMappingsDeleteResult, ModelMappingsListResult, ModelMappingsResolveCreateResult, ModelMappingsUpdateResult, ModelRankingRefreshTriggerRequest, ModelRankingsJobsListResult, ModelRankingsListResult, ModelRankingsRefreshResult, ModelRankingsStatusRetrieveResult, ModelsCreateResult, ModelsDeleteResult, ModelsListResult, ModelsRefreshResult, ModelsUpdateResult, ModelVendorsCreateResult, ModelVendorsListResult, RouteExplainCreateResult

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



class AiApi:
    """ai ai API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.channel_groups = AiChannelGroupsApi(client)
        self.model_mappings = AiModelMappingsApi(client)
        self.model_rankings = AiModelRankingsApi(client)
        self.model_vendors = AiModelVendorsApi(client)
        self.models = AiModelsApi(client)
        self.ai_resource_groups = AiAiResourceGroupsApi(client)
        self.ai_resources = AiAiResourcesApi(client)
        self.route_explain = AiRouteExplainApi(client)


class AiChannelGroupsApi:
    """ai ai.channel_groups API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.channel_bindings = AiChannelGroupsChannelBindingsApi(client)
        self.route_explain = AiChannelGroupsRouteExplainApi(client)


    def list(self) -> ChannelGroupsListResult:
        """List groups"""
        return self._client.get(f"/backend/v3/api/ai/channel_groups")

    def create(self, body: AdminChannelGroupCreateRequest) -> ChannelGroupsCreateResult:
        """Create group"""
        return self._client.post(f"/backend/v3/api/ai/channel_groups", json=body)

    def delete(self, channel_group_id: str) -> ChannelGroupsDeleteResult:
        """Delete group"""
        return self._client.delete(f"/backend/v3/api/ai/channel_groups/{serialize_path_parameter(channel_group_id, {'name': 'channelGroupId', 'style': 'simple', 'explode': False})}")

    def update(self, channel_group_id: str, body: AdminChannelGroupUpdateRequest) -> ChannelGroupsUpdateResult:
        """Update group"""
        return self._client.patch(f"/backend/v3/api/ai/channel_groups/{serialize_path_parameter(channel_group_id, {'name': 'channelGroupId', 'style': 'simple', 'explode': False})}", json=body)

class AiChannelGroupsChannelBindingsApi:
    """ai ai.channel_groups.channel_bindings API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, channel_group_id: str) -> ChannelGroupsChannelBindingsListResult:
        """List group channel bindings"""
        return self._client.get(f"/backend/v3/api/ai/channel_groups/{serialize_path_parameter(channel_group_id, {'name': 'channelGroupId', 'style': 'simple', 'explode': False})}/channel_bindings")

    def update(self, channel_group_id: str, body: AdminChannelGroupChannelBindingsReplaceRequest) -> ChannelGroupsChannelBindingsUpdateResult:
        """Replace group channel bindings"""
        return self._client.put(f"/backend/v3/api/ai/channel_groups/{serialize_path_parameter(channel_group_id, {'name': 'channelGroupId', 'style': 'simple', 'explode': False})}/channel_bindings", json=body)

class AiChannelGroupsRouteExplainApi:
    """ai ai.channel_groups.route_explain API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self, channel_group_id: str) -> ChannelGroupsRouteExplainRetrieveResult:
        """List group route explain"""
        return self._client.get(f"/backend/v3/api/ai/channel_groups/{serialize_path_parameter(channel_group_id, {'name': 'channelGroupId', 'style': 'simple', 'explode': False})}/route_explain")

class AiModelMappingsApi:
    """ai ai.model_mappings API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.resolve = AiModelMappingsResolveApi(client)


    def list(self, binding_type: Optional[str] = None, vendor_code: Optional[str] = None, channel_id: Optional[str] = None, channel_code: Optional[str] = None, q: Optional[str] = None) -> ModelMappingsListResult:
        """List model mappings"""
        query = build_query_string([
            {'name': 'binding_type', 'value': binding_type, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'vendor_code', 'value': vendor_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel_id', 'value': channel_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel_code', 'value': channel_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/ai/model_mappings", query))

    def create(self, body: AdminModelMappingCreateRequest) -> ModelMappingsCreateResult:
        """Create model mapping"""
        return self._client.post(f"/backend/v3/api/ai/model_mappings", json=body)

    def delete(self, mapping_id: str) -> ModelMappingsDeleteResult:
        """Delete model mapping"""
        return self._client.delete(f"/backend/v3/api/ai/model_mappings/{serialize_path_parameter(mapping_id, {'name': 'mappingId', 'style': 'simple', 'explode': False})}")

    def update(self, mapping_id: str, body: AdminModelMappingUpdateRequest) -> ModelMappingsUpdateResult:
        """Update model mapping"""
        return self._client.patch(f"/backend/v3/api/ai/model_mappings/{serialize_path_parameter(mapping_id, {'name': 'mappingId', 'style': 'simple', 'explode': False})}", json=body)

class AiModelMappingsResolveApi:
    """ai ai.model_mappings.resolve API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: AdminModelMappingResolveRequest) -> ModelMappingsResolveCreateResult:
        """Resolve model mapping"""
        return self._client.post(f"/backend/v3/api/ai/model_mappings/resolve", json=body)

class AiModelRankingsApi:
    """ai ai.model_rankings API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.jobs = AiModelRankingsJobsApi(client)
        self.status = AiModelRankingsStatusApi(client)


    def list(self, rank_scope: Optional[str] = None, vendor_code: Optional[str] = None, modality: Optional[str] = None, q: Optional[str] = None, limit: Optional[str] = None) -> ModelRankingsListResult:
        """List model rankings"""
        query = build_query_string([
            {'name': 'rank_scope', 'value': rank_scope, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'vendor_code', 'value': vendor_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'modality', 'value': modality, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/ai/model_rankings", query))

    def refresh(self, body: ModelRankingRefreshTriggerRequest) -> ModelRankingsRefreshResult:
        """Trigger model ranking refresh"""
        return self._client.post(f"/backend/v3/api/ai/model_rankings/refresh", json=body)

class AiModelRankingsJobsApi:
    """ai ai.model_rankings.jobs API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, rank_scope: Optional[str] = None, limit: Optional[str] = None) -> ModelRankingsJobsListResult:
        """List model ranking refresh jobs"""
        query = build_query_string([
            {'name': 'rank_scope', 'value': rank_scope, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/ai/model_rankings/jobs", query))

class AiModelRankingsStatusApi:
    """ai ai.model_rankings.status API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def retrieve(self, rank_scope: Optional[str] = None) -> ModelRankingsStatusRetrieveResult:
        """List model ranking refresh status"""
        query = build_query_string([
            {'name': 'rank_scope', 'value': rank_scope, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/ai/model_rankings/status", query))

class AiModelVendorsApi:
    """ai ai.model_vendors API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ModelVendorsListResult:
        """List vendors"""
        return self._client.get(f"/backend/v3/api/ai/model_vendors")

    def create(self, body: AdminModelVendorCreateRequest) -> ModelVendorsCreateResult:
        """Create vendor"""
        return self._client.post(f"/backend/v3/api/ai/model_vendors", json=body)

class AiModelsApi:
    """ai ai.models API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ModelsListResult:
        """List models"""
        return self._client.get(f"/backend/v3/api/ai/models")

    def create(self, body: AdminAiModelCreateRequest) -> ModelsCreateResult:
        """Create model"""
        return self._client.post(f"/backend/v3/api/ai/models", json=body)

    def refresh(self, body: AdminModelCatalogSyncRequest) -> ModelsRefreshResult:
        """Sync vendors and models"""
        return self._client.post(f"/backend/v3/api/ai/models/refresh", json=body)

    def delete(self, model_id: str) -> ModelsDeleteResult:
        """Delete model"""
        return self._client.delete(f"/backend/v3/api/ai/models/{serialize_path_parameter(model_id, {'name': 'modelId', 'style': 'simple', 'explode': False})}")

    def update(self, model_id: str, body: AdminAiModelUpdateRequest) -> ModelsUpdateResult:
        """Update model"""
        return self._client.patch(f"/backend/v3/api/ai/models/{serialize_path_parameter(model_id, {'name': 'modelId', 'style': 'simple', 'explode': False})}", json=body)

class AiAiResourceGroupsApi:
    """ai ai.ai_resource_groups API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.resources = AiAiResourceGroupsResourcesApi(client)


    def list(self) -> AiResourceGroupsListResult:
        """List resource groups"""
        return self._client.get(f"/backend/v3/api/ai/resource_groups")

    def create(self, body: AdminAiResourceGroupCreateRequest) -> AiResourceGroupsCreateResult:
        """Create resource group"""
        return self._client.post(f"/backend/v3/api/ai/resource_groups", json=body)

    def delete(self, group_id: str) -> AiResourceGroupsDeleteResult:
        """Delete resource group"""
        return self._client.delete(f"/backend/v3/api/ai/resource_groups/{serialize_path_parameter(group_id, {'name': 'groupId', 'style': 'simple', 'explode': False})}")

    def update(self, group_id: str, body: AdminAiResourceGroupUpdateRequest) -> AiResourceGroupsUpdateResult:
        """Update resource group"""
        return self._client.patch(f"/backend/v3/api/ai/resource_groups/{serialize_path_parameter(group_id, {'name': 'groupId', 'style': 'simple', 'explode': False})}", json=body)

class AiAiResourceGroupsResourcesApi:
    """ai ai.ai_resource_groups.resources API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, group_id_or_code: str) -> AiResourceGroupsResourcesListResult:
        """List resource group resources"""
        return self._client.get(f"/backend/v3/api/ai/resource_groups/{serialize_path_parameter(group_id_or_code, {'name': 'groupIdOrCode', 'style': 'simple', 'explode': False})}/resources")

class AiAiResourcesApi:
    """ai ai.ai_resources API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> AiResourcesListResult:
        """List ai resources"""
        return self._client.get(f"/backend/v3/api/ai/resources")

    def create(self, body: AdminAiResourceCreateRequest) -> AiResourcesCreateResult:
        """Create ai resource"""
        return self._client.post(f"/backend/v3/api/ai/resources", json=body)

    def update(self, resource_id: str, body: AdminAiResourceUpdateRequest) -> AiResourcesUpdateResult:
        """Update ai resource"""
        return self._client.put(f"/backend/v3/api/ai/resources/{serialize_path_parameter(resource_id, {'name': 'resourceId', 'style': 'simple', 'explode': False})}", json=body)

class AiRouteExplainApi:
    """ai ai.route_explain API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: AdminRuntimeRouteExplainRequest) -> RouteExplainCreateResult:
        """List runtime route explain"""
        return self._client.post(f"/backend/v3/api/ai/route_explain", json=body)
