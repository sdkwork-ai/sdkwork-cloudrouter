from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import ViduAudioGenerationTask, ViduTextToAudioRequest, ViduTimingToAudioRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class AudioViduApi:
    """audio_vidu API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_ent_v2_text2audio(self, body: ViduTextToAudioRequest) -> ViduAudioGenerationTask:
        """Vidu text to audio"""
        return self._client.post(f"/vidu/ent/v2/text2audio", json=body)

    def create_ent_v2_timing2audio(self, body: ViduTimingToAudioRequest) -> ViduAudioGenerationTask:
        """Vidu timing to audio"""
        return self._client.post(f"/vidu/ent/v2/timing2audio", json=body)
