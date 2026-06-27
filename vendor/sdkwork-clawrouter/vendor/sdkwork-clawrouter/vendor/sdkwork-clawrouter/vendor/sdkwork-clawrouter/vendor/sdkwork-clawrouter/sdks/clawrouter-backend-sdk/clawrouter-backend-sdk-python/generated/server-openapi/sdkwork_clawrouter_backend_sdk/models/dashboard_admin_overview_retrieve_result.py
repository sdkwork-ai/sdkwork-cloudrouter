from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_dashboard_data_response import AdminDashboardDataResponse


@dataclass
class DashboardAdminOverviewRetrieveResult:
    """Dashboard admin overview retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminDashboardDataResponse] = None
    msg: Optional[str] = None
