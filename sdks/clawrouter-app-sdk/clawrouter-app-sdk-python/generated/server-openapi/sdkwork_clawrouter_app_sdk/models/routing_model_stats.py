from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RoutingModelStats:
    """Routing model stats schema exposed by Claw Router."""
    lat: str
    m: str
    req: str
    sr: str
    tok: str
