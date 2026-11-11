from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import VolcengineImageGenerationRequest, VolcengineImageGenerationResponse

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class ImagesVolcengineApi:
    """images_volcengine API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_api_v3_images_generation(self, body: VolcengineImageGenerationRequest) -> VolcengineImageGenerationResponse:
        """Volcengine Ark image generation"""
        return self._client.post(f"/volcengine/api/v3/images/generations", json=body)
