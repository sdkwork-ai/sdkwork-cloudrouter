from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import OpenAiDeepSeekWebFetchRequest, OpenAiDeepSeekWebFetchResponse, OpenAiDeepSeekWebSearchRequest, OpenAiDeepSeekWebSearchResponse

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class ToolApi:
    """tool API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_fetch(self, body: OpenAiDeepSeekWebFetchRequest) -> OpenAiDeepSeekWebFetchResponse:
        """Fetch a web page"""
        return self._client.post(f"/v1/tools/fetch", json=body)

    def search(self, body: OpenAiDeepSeekWebSearchRequest) -> OpenAiDeepSeekWebSearchResponse:
        """Search the web"""
        return self._client.post(f"/v1/tools/search", json=body)
