from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .xai_image_url import XaiImageUrl


@dataclass
class XaiImageEditRequest:
    """xAI Grok Imagine image edit request (EditImageRequest)."""
    prompt: str
    aspect_ratio: Optional[str] = None
    deferred: Optional[bool] = None
    image: Optional[XaiImageUrl] = None
    images: Optional[List[XaiImageUrl]] = None
    model: Optional[str] = None
    n: Optional[int] = None
    output: Optional[Dict[str, str]] = None
    resolution: Optional[str] = None
    response_format: Optional[str] = None
    storage_options: Optional[Dict[str, str]] = None
    user: Optional[str] = None
