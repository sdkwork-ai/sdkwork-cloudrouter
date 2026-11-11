from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .zhipu_content_filter import ZhipuContentFilter
    from .zhipu_image_result import ZhipuImageResult


@dataclass
class ZhipuImageGenerationResponse:
    """Zhipu image generation response."""
    content_filter: Optional[List[ZhipuContentFilter]] = None
    created: Optional[int] = None
    data: Optional[List[ZhipuImageResult]] = None
