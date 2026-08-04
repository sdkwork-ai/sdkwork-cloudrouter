from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideo:
    """OpenAI-compatible video object."""
    id: str
    object: str
    status: str
    completed_at: Optional[int] = None
    content_url: Optional[str] = None
    created_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    prompt: Optional[str] = None
    seconds: Optional[int] = None
    size: Optional[str] = None
    url: Optional[str] = None
