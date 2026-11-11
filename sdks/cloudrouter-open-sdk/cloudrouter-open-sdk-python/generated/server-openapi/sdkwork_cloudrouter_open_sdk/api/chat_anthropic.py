from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import AnthropicCountMessageTokensRequest, AnthropicCountMessageTokensResponse, AnthropicMessage, AnthropicMessageCreateRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"



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



class ChatAnthropicApi:
    """chat_anthropic API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_v1_message(self, body: AnthropicMessageCreateRequest, anthropic_version: str) -> AnthropicMessage:
        """Anthropic Claude message"""
        request_headers = build_request_headers(
            {
                'anthropic-version': {'value': anthropic_version, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/anthropic/v1/messages", json=body, headers=request_headers)

    def create_v1_messages_count_token(self, body: AnthropicCountMessageTokensRequest, anthropic_version: str) -> AnthropicCountMessageTokensResponse:
        """Anthropic count message tokens"""
        request_headers = build_request_headers(
            {
                'anthropic-version': {'value': anthropic_version, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/anthropic/v1/messages/count_tokens", json=body, headers=request_headers)
