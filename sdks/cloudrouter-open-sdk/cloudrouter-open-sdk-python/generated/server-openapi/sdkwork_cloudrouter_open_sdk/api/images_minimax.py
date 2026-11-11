from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import MinimaxImageGenerationRequest, MinimaxImageGenerationResponse

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class ImagesMinimaxApi:
    """images_minimax API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_v1_image_generation(self, body: MinimaxImageGenerationRequest) -> MinimaxImageGenerationResponse:
        """MiniMax image generation"""
        return self._client.post(f"/minimax/v1/image_generation", json=body)
