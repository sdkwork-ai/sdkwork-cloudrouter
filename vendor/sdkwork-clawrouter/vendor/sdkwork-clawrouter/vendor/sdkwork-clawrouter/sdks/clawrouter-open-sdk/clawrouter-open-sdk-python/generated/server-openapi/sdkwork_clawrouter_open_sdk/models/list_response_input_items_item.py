from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_token_usage import OpenAiTokenUsage


@dataclass
class ListResponseInputItemsItem:
    """Item module returned inside the listResponseInputItems list response."""
    content: Optional[str] = None
    created: Optional[int] = None
    created_at: Optional[int] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    object: Optional[str] = None
    output: Optional[List[str]] = None
    role: Optional[str] = None
    status: Optional[str] = None
    usage: Optional[OpenAiTokenUsage] = None
