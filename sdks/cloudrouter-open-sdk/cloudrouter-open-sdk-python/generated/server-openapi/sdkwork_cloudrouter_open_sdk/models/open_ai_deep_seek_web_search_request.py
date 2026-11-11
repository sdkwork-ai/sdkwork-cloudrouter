from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiDeepSeekWebSearchRequest:
    """DeepSeek-compatible web search request."""
    query: str
    count: Optional[int] = None
    localization: Optional[str] = None
    need_content: Optional[bool] = None
    ori_question: Optional[str] = None
