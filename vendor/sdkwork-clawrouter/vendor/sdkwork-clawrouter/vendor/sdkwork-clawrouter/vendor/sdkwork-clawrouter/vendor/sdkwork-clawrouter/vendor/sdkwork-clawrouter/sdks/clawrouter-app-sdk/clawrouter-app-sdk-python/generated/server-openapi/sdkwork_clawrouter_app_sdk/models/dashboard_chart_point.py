from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DashboardChartPoint:
    """Dashboard chart point schema exposed by Claw Router."""
    audio_whisper: float
    image_midjourney_dall_e: float
    llm_text: float
    music_suno: float
    time: str
    video_runway_sora: float
