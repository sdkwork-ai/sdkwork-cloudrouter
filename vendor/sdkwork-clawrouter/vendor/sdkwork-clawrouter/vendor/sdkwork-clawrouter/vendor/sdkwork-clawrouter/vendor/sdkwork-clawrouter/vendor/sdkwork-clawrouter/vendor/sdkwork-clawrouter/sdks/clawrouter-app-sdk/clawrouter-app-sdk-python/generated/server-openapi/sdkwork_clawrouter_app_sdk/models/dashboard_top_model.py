from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DashboardTopModel:
    """Dashboard top model schema exposed by Claw Router."""
    cost: float
    is_up: bool
    modality: str
    name: str
    rank: str
    requests: str
    supplier: str
    trend: str
