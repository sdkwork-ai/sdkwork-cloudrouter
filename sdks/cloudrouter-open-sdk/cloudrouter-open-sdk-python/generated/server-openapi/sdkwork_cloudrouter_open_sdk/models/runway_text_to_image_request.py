from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RunwayTextToImageRequest:
    """Runway text-to-image task request (union of the vendor's per-model request variants)."""
    prompt_text: str
    background: Optional[str] = None
    background_color: Optional[str] = None
    colors: Optional[List[str]] = None
    content_moderation: Optional[Dict[str, str]] = None
    edit: Optional[bool] = None
    grounding: Optional[bool] = None
    mask_uri: Optional[str] = None
    model: Optional[str] = None
    output_count: Optional[int] = None
    output_format: Optional[str] = None
    precise_edit: Optional[bool] = None
    quality: Optional[str] = None
    ratio: Optional[str] = None
    reference_images: Optional[List[Dict[str, str]]] = None
    seed: Optional[int] = None
    thinking_level: Optional[str] = None
