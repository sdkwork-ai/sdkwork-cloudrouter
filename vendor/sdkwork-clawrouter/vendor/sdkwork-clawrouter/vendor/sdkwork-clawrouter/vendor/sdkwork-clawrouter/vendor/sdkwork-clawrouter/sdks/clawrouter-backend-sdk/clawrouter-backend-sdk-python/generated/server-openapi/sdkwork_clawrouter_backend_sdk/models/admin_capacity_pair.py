from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminCapacityPair:
    """Admin capacity pair schema exposed by Claw Router."""
    total: float
    used: float
