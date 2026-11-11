from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsCompositionPlan:
    """Composition plan for the music_v2 and music_v2_5 models."""
    chunks: List[Dict[str, str]]
