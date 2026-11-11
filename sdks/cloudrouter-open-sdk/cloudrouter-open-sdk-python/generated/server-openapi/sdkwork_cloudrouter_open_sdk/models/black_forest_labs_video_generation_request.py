from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class BlackForestLabsVideoGenerationRequest:
    """Black Forest Labs FLUX 3 video generation request (`POST /v1/flux-3-video`). The vendor body is a discriminated union on `mode`: `t2v` requires `prompt`, `i2v` requires `prompt` and `keyframes`, `v2v` requires `prompt` and `start_video`, and `draft_enhance` requires `draft_cache`."""
    mode: str
    aspect_ratio: Optional[str] = None
    draft: Optional[bool] = None
    draft_cache: Optional[str] = None
    duration: Optional[int] = None
    generate_audio: Optional[bool] = None
    keyframes: Optional[str] = None
    prompt: Optional[str] = None
    resolution: Optional[str] = None
    safety_tolerance: Optional[int] = None
    start_video: Optional[str] = None
    user: Optional[str] = None
    version: Optional[str] = None
