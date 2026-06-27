from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import OpenAiImageEditRequest, OpenAiImageGenerationRequest, OpenAiImageList, OpenAiImageVariationRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class ImagesApi:
    """image API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_edit(self, body: OpenAiImageEditRequest) -> OpenAiImageList:
        """Create image edit"""
        return self._client.post(f"/v1/images/edits", json=body)

    def create_generation(self, body: OpenAiImageGenerationRequest) -> OpenAiImageList:
        """Create image"""
        return self._client.post(f"/v1/images/generations", json=body)

    def create_variation(self, body: OpenAiImageVariationRequest) -> OpenAiImageList:
        """Create image variation"""
        return self._client.post(f"/v1/images/variations", json=body)
