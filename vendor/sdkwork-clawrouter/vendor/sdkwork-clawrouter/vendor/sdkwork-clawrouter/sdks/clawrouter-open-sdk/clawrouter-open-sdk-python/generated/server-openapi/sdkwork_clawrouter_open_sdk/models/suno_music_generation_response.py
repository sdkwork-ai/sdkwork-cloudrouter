from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class SunoMusicGenerationResponse:
    """Suno-compatible suno music generation response schema exposed by Claw Router vendor routing."""
    created_at: Optional[str] = None
    id: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[str] = None
