from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_deep_seek_web_search_result import OpenAiDeepSeekWebSearchResult


@dataclass
class OpenAiDeepSeekWebSearchResponse:
    """DeepSeek-compatible web search response."""
    results: List[OpenAiDeepSeekWebSearchResult]
