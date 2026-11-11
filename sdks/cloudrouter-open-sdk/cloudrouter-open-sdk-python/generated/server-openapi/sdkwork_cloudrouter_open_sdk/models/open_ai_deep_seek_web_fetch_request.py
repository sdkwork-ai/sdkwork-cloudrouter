from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiDeepSeekWebFetchRequest:
    """DeepSeek-compatible request to fetch a single web page as Markdown."""
    url: str
