from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMonitorNodeItem:
    """Admin monitor node item schema exposed by Claw Router."""
    cpu: float
    id: str
    ip: str
    memory: float
    name: str
    region: str
    status: str
    uptime: str
