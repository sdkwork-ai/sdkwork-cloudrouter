from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import TypeSafeSystemOneRequest, TypeSafeSystemOneResponse

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class ChatTypesafeApi:
    """chat_typesafe API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_v1_systemone(self, body: TypeSafeSystemOneRequest) -> TypeSafeSystemOneResponse:
        """TypeSafe AI System One decision"""
        return self._client.post(f"/typesafe/v1/systemone", json=body)
