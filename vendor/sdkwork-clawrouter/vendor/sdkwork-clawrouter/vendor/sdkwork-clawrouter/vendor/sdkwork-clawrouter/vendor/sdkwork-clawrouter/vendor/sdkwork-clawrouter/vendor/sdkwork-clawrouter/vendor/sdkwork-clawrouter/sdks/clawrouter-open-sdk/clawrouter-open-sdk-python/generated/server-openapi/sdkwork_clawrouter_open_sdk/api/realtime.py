from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import OpenAiRealtimeCall, OpenAiRealtimeCallActionRequest, OpenAiRealtimeCallCreateRequest, OpenAiRealtimeCallReferRequest, OpenAiRealtimeClientSecret, OpenAiRealtimeClientSecretCreateRequest, OpenAiRealtimeSession, OpenAiRealtimeSessionCreateRequest, OpenAiRealtimeTranscriptionSession, OpenAiRealtimeTranscriptionSessionCreateRequest, OpenAiRealtimeTranslationSession, OpenAiRealtimeTranslationSessionCreateRequest

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






class RealtimeApi:
    """realtime API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_call(self, body: OpenAiRealtimeCallCreateRequest) -> str:
        """Create realtime call"""
        return self._client.post(f"/v1/realtime/calls", json=body)

    def create_calls_accept(self, call_id: str, body: OpenAiRealtimeCallActionRequest) -> OpenAiRealtimeCall:
        """Accept realtime call"""
        return self._client.post(f"/v1/realtime/calls/{serialize_path_parameter(call_id, {'name': 'call_id', 'style': 'simple', 'explode': False})}/accept", json=body)

    def create_calls_hangup(self, call_id: str, body: OpenAiRealtimeCallActionRequest) -> OpenAiRealtimeCall:
        """Hang up realtime call"""
        return self._client.post(f"/v1/realtime/calls/{serialize_path_parameter(call_id, {'name': 'call_id', 'style': 'simple', 'explode': False})}/hangup", json=body)

    def create_calls_refer(self, call_id: str, body: OpenAiRealtimeCallReferRequest) -> OpenAiRealtimeCall:
        """Refer realtime call"""
        return self._client.post(f"/v1/realtime/calls/{serialize_path_parameter(call_id, {'name': 'call_id', 'style': 'simple', 'explode': False})}/refer", json=body)

    def create_calls_reject(self, call_id: str, body: OpenAiRealtimeCallActionRequest) -> OpenAiRealtimeCall:
        """Reject realtime call"""
        return self._client.post(f"/v1/realtime/calls/{serialize_path_parameter(call_id, {'name': 'call_id', 'style': 'simple', 'explode': False})}/reject", json=body)

    def create_client_secret(self, body: OpenAiRealtimeClientSecretCreateRequest) -> OpenAiRealtimeClientSecret:
        """Create realtime client secret"""
        return self._client.post(f"/v1/realtime/client_secrets", json=body)

    def create_session(self, body: OpenAiRealtimeSessionCreateRequest) -> OpenAiRealtimeSession:
        """Create realtime session"""
        return self._client.post(f"/v1/realtime/sessions", json=body)

    def create_transcription_session(self, body: OpenAiRealtimeTranscriptionSessionCreateRequest) -> OpenAiRealtimeTranscriptionSession:
        """Create realtime transcription session"""
        return self._client.post(f"/v1/realtime/transcription_sessions", json=body)

    def create_translation(self, body: OpenAiRealtimeTranslationSessionCreateRequest) -> OpenAiRealtimeTranslationSession:
        """Create realtime translation session"""
        return self._client.post(f"/v1/realtime/translations", json=body)
