from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RoutingUsageData:
    """Routing usage data schema exposed by Claw Router."""
    latency: str
    requests: str
    time: str
