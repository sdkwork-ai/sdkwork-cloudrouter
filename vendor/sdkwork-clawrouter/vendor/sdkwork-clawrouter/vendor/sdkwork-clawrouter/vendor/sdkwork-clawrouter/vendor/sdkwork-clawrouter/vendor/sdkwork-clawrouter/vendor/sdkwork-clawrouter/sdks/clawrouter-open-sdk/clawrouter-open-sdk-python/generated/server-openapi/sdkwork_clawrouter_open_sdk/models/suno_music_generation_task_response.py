from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_task_error import ProviderTaskError
    from .suno_music_track import SunoMusicTrack


@dataclass
class SunoMusicGenerationTaskResponse:
    """Suno-compatible suno music generation task response schema exposed by Claw Router vendor routing."""
    created_at: Optional[str] = None
    error: Optional[ProviderTaskError] = None
    id: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[str] = None
    title: Optional[str] = None
    tracks: Optional[List[SunoMusicTrack]] = None
    updated_at: Optional[str] = None
