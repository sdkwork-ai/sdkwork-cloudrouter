from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMonitorAlertItem:
    """Admin monitor alert item schema exposed by Claw Router."""
    id: str
    message: str
    severity: str
    source: str
    status: str
    time: str
    title: str
