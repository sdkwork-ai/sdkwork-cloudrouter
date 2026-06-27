from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminCountPair:
    """Admin count pair schema exposed by Claw Router."""
    available: float
    total: float
