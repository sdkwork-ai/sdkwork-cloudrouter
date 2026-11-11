from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiDeepSeekWebSearchResult:
    """One ranked DeepSeek web search result."""
    authority: int
    content: str
    date: Optional[str]
    rerank_score: float
    site_icon: Optional[str]
    site_name: Optional[str]
    snippet: str
    summary: str
    title: str
    url: str
