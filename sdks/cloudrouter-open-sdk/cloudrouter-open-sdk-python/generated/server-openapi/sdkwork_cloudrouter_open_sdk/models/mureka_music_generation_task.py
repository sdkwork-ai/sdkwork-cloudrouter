from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MurekaMusicGenerationTask:
    """Mureka song generation task and its produced audio."""
    audio_url: Optional[str] = None
    duration: Optional[int] = None
    error: Optional[Dict[str, str]] = None
    id: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[str] = None
    title: Optional[str] = None
