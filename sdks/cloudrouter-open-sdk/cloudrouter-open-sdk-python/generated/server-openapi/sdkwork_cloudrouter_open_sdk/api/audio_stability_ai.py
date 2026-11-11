from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import StabilityAudioRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class AudioStabilityAiApi:
    """audio_stability_ai API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_text_to_audio(self, body: StabilityAudioRequest) -> bytes:
        """Stability AI text-to-audio (music and sound effects)"""
        return self._client.request_bytes('POST', f"/stability_ai/v2beta/audio/stable-audio-2/text-to-audio", data=body)
