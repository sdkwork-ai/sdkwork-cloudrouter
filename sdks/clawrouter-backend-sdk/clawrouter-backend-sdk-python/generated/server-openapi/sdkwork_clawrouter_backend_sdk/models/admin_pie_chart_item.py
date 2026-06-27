from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminPieChartItem:
    """Admin pie chart item schema exposed by Claw Router."""
    color: str
    name: str
    value: float
