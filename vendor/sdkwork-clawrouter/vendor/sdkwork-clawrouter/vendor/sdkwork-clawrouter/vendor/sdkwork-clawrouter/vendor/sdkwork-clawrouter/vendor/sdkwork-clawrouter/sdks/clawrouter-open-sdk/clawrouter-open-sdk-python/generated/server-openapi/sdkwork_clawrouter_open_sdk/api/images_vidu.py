from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import ViduImageGenerationTask, ViduReferenceToImageRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class ImagesViduApi:
    """images_vidu API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_ent_v2_reference2image(self, body: ViduReferenceToImageRequest) -> ViduImageGenerationTask:
        """Vidu reference to image"""
        return self._client.post(f"/v1/vidu/ent/v2/reference2image", json=body)
