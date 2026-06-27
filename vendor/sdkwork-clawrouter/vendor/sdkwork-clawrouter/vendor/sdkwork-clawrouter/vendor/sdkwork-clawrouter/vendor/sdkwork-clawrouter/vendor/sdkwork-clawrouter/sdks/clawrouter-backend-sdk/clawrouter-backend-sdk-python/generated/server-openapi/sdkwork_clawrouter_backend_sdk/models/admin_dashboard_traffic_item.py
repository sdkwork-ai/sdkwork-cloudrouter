from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminDashboardTrafficItem:
    """Admin dashboard traffic item schema exposed by Claw Router."""
    cost: float
    requests: float
    time: str
    tokens: float
