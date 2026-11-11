from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .zhipu_image_result import ZhipuImageResult
    from .zhipu_video_result import ZhipuVideoResult


@dataclass
class ZhipuVideoGenerationTask:
    """Zhipu asynchronous video/image generation result."""
    created: Optional[int] = None
    id: Optional[str] = None
    image_result: Optional[List[ZhipuImageResult]] = None
    model: Optional[str] = None
    request_id: Optional[str] = None
    task_status: Optional[str] = None
    video_result: Optional[List[ZhipuVideoResult]] = None
