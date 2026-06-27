from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_monitor_alert_item import AdminMonitorAlertItem


@dataclass
class AdminMonitorAlertsResponse:
    """Admin monitor alerts response schema exposed by Claw Router."""
    items: List[AdminMonitorAlertItem]
