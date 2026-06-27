from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAnalyticsTrendPoint:
    """Admin analytics trend point schema exposed by Claw Router."""
    points: float
    requests: float
    time: str
    tokens: float
    users: str
