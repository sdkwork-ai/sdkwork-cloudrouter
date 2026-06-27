from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_monitor_performance_response import AdminMonitorPerformanceResponse


@dataclass
class MonitorPerformanceListResult:
    """Monitor performance list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMonitorPerformanceResponse] = None
    msg: Optional[str] = None
