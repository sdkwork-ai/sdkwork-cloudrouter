from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAnalyticsInsight:
    """Admin analytics insight schema exposed by Claw Router."""
    detail: str
    key: str
    severity: str
    title: str
    value: str
