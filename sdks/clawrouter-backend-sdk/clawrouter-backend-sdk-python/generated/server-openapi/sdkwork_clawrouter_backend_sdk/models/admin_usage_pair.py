from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminUsagePair:
    """Admin usage pair schema exposed by Claw Router."""
    today: float
    total: float
