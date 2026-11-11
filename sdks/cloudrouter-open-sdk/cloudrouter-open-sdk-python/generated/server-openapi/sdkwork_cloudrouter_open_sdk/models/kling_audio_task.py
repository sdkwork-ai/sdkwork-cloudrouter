from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingAudioTask:
    """Kling sound-effect task (text-to-audio / video-to-audio) and its status."""
    code: Optional[int] = None
    data: Optional[Dict[str, str]] = None
    message: Optional[str] = None
    request_id: Optional[str] = None
