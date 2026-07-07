from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import ChannelsCreateResult, ChannelsDeleteResult, ChannelsListResult, ChannelsUpdateResult, ChannelsVerifyResult, ProviderSecretsCreateResult, ProviderSecretsDeleteResult, ProviderSecretsListResult, ProviderSecretsUpdateResult

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





class IntegrationApi:
    """integration integration API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.channels = IntegrationChannelsApi(client)
        self.provider_secrets = IntegrationProviderSecretsApi(client)


class IntegrationChannelsApi:
    """integration integration.channels API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ChannelsListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/integration/channels")

    def create(self) -> ChannelsCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/integration/channels")

    def update(self) -> ChannelsUpdateResult:
        """Update"""
        return self._client.put(f"/backend/v3/api/integration/channels")

    def delete(self, channel_id: str) -> ChannelsDeleteResult:
        """Delete"""
        return self._client.delete(f"/backend/v3/api/integration/channels/{serialize_path_parameter(channel_id, {'name': 'channelId', 'style': 'simple', 'explode': False})}")

    def verify(self, channel_id: str) -> ChannelsVerifyResult:
        """Verify"""
        return self._client.post(f"/backend/v3/api/integration/channels/{serialize_path_parameter(channel_id, {'name': 'channelId', 'style': 'simple', 'explode': False})}/verify")

class IntegrationProviderSecretsApi:
    """integration integration.provider_secrets API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self) -> ProviderSecretsListResult:
        """List"""
        return self._client.get(f"/backend/v3/api/integration/provider_secrets")

    def create(self) -> ProviderSecretsCreateResult:
        """Create"""
        return self._client.post(f"/backend/v3/api/integration/provider_secrets")

    def update(self) -> ProviderSecretsUpdateResult:
        """Update"""
        return self._client.put(f"/backend/v3/api/integration/provider_secrets")

    def delete(self, secret_id: str) -> ProviderSecretsDeleteResult:
        """Delete"""
        return self._client.delete(f"/backend/v3/api/integration/provider_secrets/{serialize_path_parameter(secret_id, {'name': 'secretId', 'style': 'simple', 'explode': False})}")
