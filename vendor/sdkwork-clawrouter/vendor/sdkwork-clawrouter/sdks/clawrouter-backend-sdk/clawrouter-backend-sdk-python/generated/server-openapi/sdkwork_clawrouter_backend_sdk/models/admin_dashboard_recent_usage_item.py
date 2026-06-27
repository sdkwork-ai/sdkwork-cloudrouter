from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminDashboardRecentUsageItem:
    """Admin dashboard recent usage item schema exposed by Claw Router."""
    billing_mode: str
    cost: str
    id: str
    is_api_user: bool
    model: str
    status: str
    time: str
    type: str
    user: str
    usage_count: Optional[float] = None
    usage_in: Optional[float] = None
    usage_out: Optional[float] = None
