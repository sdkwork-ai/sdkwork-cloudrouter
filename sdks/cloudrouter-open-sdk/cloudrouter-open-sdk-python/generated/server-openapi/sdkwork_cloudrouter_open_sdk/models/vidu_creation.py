from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduCreation:
    """Generated media record returned by Vidu task creation endpoints."""
    audio_url: Optional[str] = None
    cover_url: Optional[str] = None
    created_at: Optional[str] = None
    duration: Optional[float] = None
    height: Optional[int] = None
    id: Optional[str] = None
    image_url: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    url: Optional[str] = None
    video_url: Optional[str] = None
    width: Optional[int] = None
