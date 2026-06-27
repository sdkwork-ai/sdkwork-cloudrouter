from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_monitor_performance_item import AdminMonitorPerformanceItem


@dataclass
class AdminMonitorPerformanceResponse:
    """Admin monitor performance response schema exposed by Claw Router."""
    items: List[AdminMonitorPerformanceItem]
