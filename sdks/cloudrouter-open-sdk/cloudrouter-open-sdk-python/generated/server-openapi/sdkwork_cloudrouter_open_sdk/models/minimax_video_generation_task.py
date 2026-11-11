from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .minimax_base_resp import MinimaxBaseResp


@dataclass
class MinimaxVideoGenerationTask:
    """MiniMax asynchronous video generation task, its status, and the produced file id."""
    base_resp: Optional[MinimaxBaseResp] = None
    file_id: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[str] = None
    video_height: Optional[int] = None
    video_width: Optional[int] = None
