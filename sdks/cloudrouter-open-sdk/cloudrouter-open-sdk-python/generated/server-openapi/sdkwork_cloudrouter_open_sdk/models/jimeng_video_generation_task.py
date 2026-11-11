from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class JimengVideoGenerationTask:
    """Jimeng video generation task and its generated video."""
    created_at: Optional[int] = None
    error: Optional[Dict[str, str]] = None
    id: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[str] = None
    video_url: Optional[str] = None
