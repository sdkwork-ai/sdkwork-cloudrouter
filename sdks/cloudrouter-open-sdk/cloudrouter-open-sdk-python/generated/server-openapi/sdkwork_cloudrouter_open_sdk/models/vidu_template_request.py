from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduTemplateRequest:
    """Vidu template video request schema (motion sync templates such as motion_control_2) exposed by Cloud Router vendor routing."""
    template: str
    images: List[str]
    video_urls: List[str]
    payload: Optional[str] = None
    callback_url: Optional[str] = None
