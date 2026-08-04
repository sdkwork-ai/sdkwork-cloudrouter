from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import AnthropicCountMessageTokensRequest, AnthropicCountMessageTokensResponse, AnthropicMessage, AnthropicMessageCreateRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"






class ChatAnthropicApi:
    """chat_anthropic API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_v1_message(self, body: AnthropicMessageCreateRequest) -> AnthropicMessage:
        """Anthropic Claude message"""
        return self._client.post(f"/v1/anthropic/v1/messages", json=body)

    def create_v1_messages_count_token(self, body: AnthropicCountMessageTokensRequest) -> AnthropicCountMessageTokensResponse:
        """Anthropic count message tokens"""
        return self._client.post(f"/v1/anthropic/v1/messages/count_tokens", json=body)
