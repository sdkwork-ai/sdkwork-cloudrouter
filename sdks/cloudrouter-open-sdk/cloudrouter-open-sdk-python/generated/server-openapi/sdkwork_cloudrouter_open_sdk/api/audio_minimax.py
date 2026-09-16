from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import MiniMaxMusicGenerationRequest, MiniMaxMusicGenerationResponse

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class AudioMinimaxApi:
    """audio_minimax API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_v1_music_generation(self, body: MiniMaxMusicGenerationRequest) -> MiniMaxMusicGenerationResponse:
        """Minimax create music generation"""
        return self._client.post(f"/minimax/v1/music_generation", json=body)
