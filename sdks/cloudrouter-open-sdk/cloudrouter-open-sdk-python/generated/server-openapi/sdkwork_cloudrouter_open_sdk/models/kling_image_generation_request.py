from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .kling_element_reference import KlingElementReference
    from .kling_watermark_info import KlingWatermarkInfo


@dataclass
class KlingImageGenerationRequest:
    """Kling image generation request (`POST /v1/images/generations`)."""
    prompt: str
    aspect_ratio: Optional[str] = None
    callback_url: Optional[str] = None
    element_list: Optional[List[KlingElementReference]] = None
    external_task_id: Optional[str] = None
    human_fidelity: Optional[float] = None
    image: Optional[str] = None
    image_fidelity: Optional[float] = None
    image_reference: Optional[str] = None
    model_name: Optional[str] = None
    n: Optional[int] = None
    negative_prompt: Optional[str] = None
    resolution: Optional[str] = None
    watermark_info: Optional[KlingWatermarkInfo] = None
