from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduTemplateRequest:
    """Vidu vidu template request schema exposed by Cloud Router vendor routing."""
    images: List[str]
    template: str
    video_urls: List[str]
    callback_url: Optional[str] = None
    payload: Optional[str] = None
