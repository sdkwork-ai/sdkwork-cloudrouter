from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import AlibabaSpeechRequest, AlibabaSpeechResponse

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class AudioAlibabaApi:
    """audio_alibaba API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_api_v1_services_audio_tts_speech_synthesizer(self, body: AlibabaSpeechRequest) -> AlibabaSpeechResponse:
        """Alibaba Qwen TTS speech synthesis"""
        return self._client.post(f"/alibaba/api/v1/services/audio/tts/SpeechSynthesizer", json=body)
