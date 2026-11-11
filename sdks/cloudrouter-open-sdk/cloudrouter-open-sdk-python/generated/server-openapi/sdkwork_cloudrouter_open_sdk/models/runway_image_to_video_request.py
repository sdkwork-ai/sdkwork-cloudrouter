from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RunwayImageToVideoRequest:
    """Runway image-to-video task request (union of the vendor's per-model request variants)."""
    model: str
    prompt_image: str
    audio: Optional[bool] = None
    bitrate: Optional[str] = None
    cfg_scale: Optional[float] = None
    content_moderation: Optional[Dict[str, str]] = None
    draft: Optional[bool] = None
    duration: Optional[int] = None
    negative_prompt: Optional[str] = None
    output_format: Optional[str] = None
    prompt_expansion_mode: Optional[str] = None
    prompt_text: Optional[str] = None
    prores_profile: Optional[str] = None
    provider_settings: Optional[Dict[str, str]] = None
    ratio: Optional[str] = None
    reference_audio: Optional[List[Dict[str, str]]] = None
    reference_videos: Optional[List[Dict[str, str]]] = None
    references: Optional[List[Dict[str, str]]] = None
    resolution: Optional[str] = None
    seed: Optional[int] = None
