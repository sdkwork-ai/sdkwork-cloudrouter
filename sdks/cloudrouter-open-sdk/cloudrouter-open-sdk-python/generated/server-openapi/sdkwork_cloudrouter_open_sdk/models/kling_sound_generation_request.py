from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingSoundGenerationRequest:
    """Kling text-to-sound-effect request."""
    duration: float
    prompt: str
    callback_url: Optional[str] = None
    external_task_id: Optional[str] = None
