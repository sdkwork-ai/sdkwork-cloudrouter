from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .kling_image_task_data import KlingImageTaskData


@dataclass
class KlingImageGenerationTask:
    """Kling image task envelope returned by the create and query endpoints."""
    code: Optional[int] = None
    data: Optional[KlingImageTaskData] = None
    message: Optional[str] = None
    request_id: Optional[str] = None
