from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MinimaxStreamOptions:
    """MiniMax TTS streaming options."""
    exclude_aggregated_audio: Optional[bool] = None
