from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MinimaxImageGenerationRequest:
    """MiniMax image generation request (union of the legacy text-to-image and image-to-image `/v1/image_generation` variants)."""
    model: str
    prompt: str
    aspect_ratio: Optional[str] = None
    height: Optional[int] = None
    n: Optional[int] = None
    prompt_optimizer: Optional[bool] = None
    response_format: Optional[str] = None
    seed: Optional[int] = None
    subject_reference: Optional[List[Dict[str, str]]] = None
    width: Optional[int] = None
