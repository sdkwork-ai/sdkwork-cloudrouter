from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import BlackForestLabsVideoGenerationRequest, BlackForestLabsVideoGenerationTask

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class VideosBlackForestLabsApi:
    """videos_black_forest_labs API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_flux_3_video(self, body: BlackForestLabsVideoGenerationRequest) -> BlackForestLabsVideoGenerationTask:
        """Black Forest Labs FLUX 3 video generation"""
        return self._client.post(f"/black_forest_labs/v1/flux-3-video", json=body)
