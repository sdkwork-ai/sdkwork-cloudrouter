from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .vidu_creation import ViduCreation


@dataclass
class ViduImageGenerationTask:
    """Vidu vidu image generation task schema exposed by Cloud Router vendor routing."""
    aspect_ratio: Optional[str] = None
    callback_url: Optional[str] = None
    created_at: Optional[str] = None
    creations: Optional[List[ViduCreation]] = None
    credits: Optional[int] = None
    duration: Optional[int] = None
    err_code: Optional[str] = None
    images: Optional[List[str]] = None
    model: Optional[str] = None
    off_peak: Optional[bool] = None
    payload: Optional[str] = None
    prompt: Optional[str] = None
    resolution: Optional[str] = None
    seed: Optional[int] = None
    state: Optional[str] = None
    task_id: Optional[str] = None
    watermark: Optional[bool] = None
