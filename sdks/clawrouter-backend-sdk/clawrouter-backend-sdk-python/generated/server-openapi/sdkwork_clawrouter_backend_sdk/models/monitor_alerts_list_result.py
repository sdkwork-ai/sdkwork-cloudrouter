from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_monitor_alerts_response import AdminMonitorAlertsResponse


@dataclass
class MonitorAlertsListResult:
    """Monitor alerts list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMonitorAlertsResponse] = None
    msg: Optional[str] = None
