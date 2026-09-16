from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import OpenAiSpeechCreateRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class AudioVolcengineApi:
    """audio_volcengine API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_api_v3_audio_speech(self, body: OpenAiSpeechCreateRequest) -> bytes:
        """Volcengine create speech"""
        return self._client.request_bytes('POST', f"/volcengine/api/v3/audio/speech", json=body)
