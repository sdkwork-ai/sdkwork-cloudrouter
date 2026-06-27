from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DashboardSparklinePoint:
    """Dashboard sparkline point schema exposed by Claw Router."""
    value: float
