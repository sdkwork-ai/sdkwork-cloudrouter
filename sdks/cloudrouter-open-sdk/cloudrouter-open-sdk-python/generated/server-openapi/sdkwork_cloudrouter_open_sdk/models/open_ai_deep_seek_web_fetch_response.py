from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiDeepSeekWebFetchResponse:
    """DeepSeek-compatible fetched page: title plus Markdown body."""
    content: str
    title: str
