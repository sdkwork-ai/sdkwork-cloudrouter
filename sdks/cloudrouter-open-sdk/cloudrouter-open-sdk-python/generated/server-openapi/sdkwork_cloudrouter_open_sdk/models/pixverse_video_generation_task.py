from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .pixverse_error_detail import PixverseErrorDetail
    from .pixverse_task_resp import PixverseTaskResp


@dataclass
class PixverseVideoGenerationTask:
    """PixVerse video generation status and its outputs."""
    err_code: Optional[int] = None
    err_msg: Optional[str] = None
    error: Optional[PixverseErrorDetail] = None
    resp: Optional[PixverseTaskResp] = None
