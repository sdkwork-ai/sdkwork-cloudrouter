from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .xai_image_url import XaiImageUrl


@dataclass
class XaiVideoGenerationRequest:
    """xAI Grok Imagine video generation request (GenerateVideoRequest). prompt is required for text-to-video and reference-to-video and optional when image supplies the first frame."""
    aspect_ratio: Optional[str] = None
    duration: Optional[int] = None
    image: Optional[XaiImageUrl] = None
    keyframes: Optional[List[XaiImageUrl]] = None
    model: Optional[str] = None
    output: Optional[Dict[str, str]] = None
    prompt: Optional[str] = None
    reference_audios: Optional[List[str]] = None
    reference_images: Optional[List[XaiImageUrl]] = None
    resolution: Optional[str] = None
    storage_options: Optional[Dict[str, str]] = None
    user: Optional[str] = None
