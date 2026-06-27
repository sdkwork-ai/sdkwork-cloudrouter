from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_monitor_node_item import AdminMonitorNodeItem


@dataclass
class AdminMonitorNodesResponse:
    """Admin monitor nodes response schema exposed by Claw Router."""
    items: List[AdminMonitorNodeItem]
