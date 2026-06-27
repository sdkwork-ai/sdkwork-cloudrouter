from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .service_provider_dashboard_response import ServiceProviderDashboardResponse


@dataclass
class DashboardRetrieveResult:
    """Dashboard retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[ServiceProviderDashboardResponse] = None
    msg: Optional[str] = None
