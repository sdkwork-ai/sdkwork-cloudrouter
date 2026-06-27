from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ListVoiceConsentsItem:
    """Item module returned inside the listVoiceConsents list response."""
    created: Optional[int] = None
    created_at: Optional[int] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    object: Optional[str] = None
    status: Optional[str] = None
    text: Optional[str] = None
    url: Optional[str] = None
    voice: Optional[str] = None
