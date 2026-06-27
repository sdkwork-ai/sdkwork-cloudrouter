from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ServiceProviderDashboardResponse:
    """Service provider dashboard response schema exposed by Claw Router."""
    item: Dict[str, Any]
