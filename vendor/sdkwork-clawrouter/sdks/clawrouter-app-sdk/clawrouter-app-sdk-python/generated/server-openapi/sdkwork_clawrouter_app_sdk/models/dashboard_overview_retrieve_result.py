from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .dashboard_overview_response import DashboardOverviewResponse


@dataclass
class DashboardOverviewRetrieveResult:
    """Dashboard overview retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[DashboardOverviewResponse] = None
    msg: Optional[str] = None
