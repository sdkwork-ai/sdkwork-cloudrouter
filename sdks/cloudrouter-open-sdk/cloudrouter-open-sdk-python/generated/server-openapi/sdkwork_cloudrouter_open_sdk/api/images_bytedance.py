from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import BytedanceImageGenerationRequest, BytedanceImageGenerationResponse

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class ImagesBytedanceApi:
    """images_bytedance API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_api_v3_images_generation(self, body: BytedanceImageGenerationRequest) -> BytedanceImageGenerationResponse:
        """ByteDance Seedream image generation"""
        return self._client.post(f"/bytedance/api/v3/images/generations", json=body)
