from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import OpenAiCompletion, OpenAiCompletionCreateRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class CompletionApi:
    """completion API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create(self, body: OpenAiCompletionCreateRequest) -> OpenAiCompletion:
        """Create completion"""
        return self._client.post(f"/v1/completions", json=body)
