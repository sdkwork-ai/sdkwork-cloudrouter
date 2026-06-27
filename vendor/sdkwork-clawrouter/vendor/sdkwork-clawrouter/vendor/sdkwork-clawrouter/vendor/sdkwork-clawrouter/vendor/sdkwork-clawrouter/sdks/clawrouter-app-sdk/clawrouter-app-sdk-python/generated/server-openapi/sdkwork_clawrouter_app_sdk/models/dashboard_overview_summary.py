from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DashboardOverviewSummary:
    """Dashboard overview summary schema exposed by Claw Router."""
    audio_requests: str
    available_credits: float
    error_count: str
    image_requests: str
    music_requests: str
    request_count: str
    rpm: float
    total_request_count: str
    total_used_credits: float
    tpm: float
    used_credits: float
    video_requests: str
