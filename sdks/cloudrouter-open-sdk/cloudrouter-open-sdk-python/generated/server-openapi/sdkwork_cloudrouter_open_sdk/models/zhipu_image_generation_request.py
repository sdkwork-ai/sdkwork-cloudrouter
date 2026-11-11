from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ZhipuImageGenerationRequest:
    """Zhipu GLM-Image / CogView image generation request (`POST /api/paas/v4/images/generations`)."""
    model: str
    prompt: str
    quality: Optional[str] = None
    size: Optional[str] = None
    user_id: Optional[str] = None
    watermark_enabled: Optional[bool] = None
