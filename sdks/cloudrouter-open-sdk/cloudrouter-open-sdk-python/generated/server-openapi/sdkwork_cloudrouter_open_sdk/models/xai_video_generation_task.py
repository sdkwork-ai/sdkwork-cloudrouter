from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .xai_usage import XaiUsage
    from .xai_video_url import XaiVideoUrl


@dataclass
class XaiVideoGenerationTask:
    """xAI video task result (VideoResponse): poll GET /xai/v1/videos/{request_id}."""
    status: str
    error: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    progress: Optional[int] = None
    request_id: Optional[str] = None
    usage: Optional[XaiUsage] = None
    video: Optional[XaiVideoUrl] = None
