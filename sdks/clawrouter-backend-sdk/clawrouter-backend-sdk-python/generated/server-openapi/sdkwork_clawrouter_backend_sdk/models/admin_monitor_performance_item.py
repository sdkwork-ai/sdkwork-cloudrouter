from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMonitorPerformanceItem:
    """Admin monitor performance item schema exposed by Claw Router."""
    cpu: float
    memory: float
    network: float
    time: str
