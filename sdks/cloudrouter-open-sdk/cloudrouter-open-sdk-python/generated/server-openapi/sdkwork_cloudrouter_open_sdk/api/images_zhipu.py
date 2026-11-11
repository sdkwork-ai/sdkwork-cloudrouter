from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import ZhipuImageGenerationRequest, ZhipuImageGenerationResponse

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class ImagesZhipuApi:
    """images_zhipu API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_api_paas_v4_images_generation(self, body: ZhipuImageGenerationRequest) -> ZhipuImageGenerationResponse:
        """Zhipu CogView image generation"""
        return self._client.post(f"/zhipu/api/paas/v4/images/generations", json=body)
