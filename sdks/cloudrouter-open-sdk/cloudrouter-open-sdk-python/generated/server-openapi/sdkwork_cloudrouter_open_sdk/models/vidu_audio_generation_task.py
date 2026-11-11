from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .vidu_creation import ViduCreation


@dataclass
class ViduAudioGenerationTask:
    """Vidu vidu audio generation task schema exposed by Cloud Router vendor routing."""
    created_at: Optional[str] = None
    creations: Optional[List[ViduCreation]] = None
    credits: Optional[int] = None
    duration: Optional[int] = None
    err_code: Optional[str] = None
    model: Optional[str] = None
    prompt: Optional[str] = None
    seed: Optional[int] = None
    state: Optional[str] = None
    task_id: Optional[str] = None
