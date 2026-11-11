from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .kling_image_task_result import KlingImageTaskResult


@dataclass
class KlingImageTaskData:
    """Kling image task record."""
    created_at: Optional[int] = None
    task_id: Optional[str] = None
    task_info: Optional[Dict[str, str]] = None
    task_result: Optional[KlingImageTaskResult] = None
    task_status: Optional[str] = None
    task_status_msg: Optional[str] = None
    updated_at: Optional[int] = None
