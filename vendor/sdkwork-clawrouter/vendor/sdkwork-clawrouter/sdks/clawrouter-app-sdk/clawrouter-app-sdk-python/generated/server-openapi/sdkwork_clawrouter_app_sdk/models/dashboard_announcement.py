from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DashboardAnnouncement:
    """Dashboard announcement schema exposed by Claw Router."""
    id: str
    text: str
    time: str
    type: str
