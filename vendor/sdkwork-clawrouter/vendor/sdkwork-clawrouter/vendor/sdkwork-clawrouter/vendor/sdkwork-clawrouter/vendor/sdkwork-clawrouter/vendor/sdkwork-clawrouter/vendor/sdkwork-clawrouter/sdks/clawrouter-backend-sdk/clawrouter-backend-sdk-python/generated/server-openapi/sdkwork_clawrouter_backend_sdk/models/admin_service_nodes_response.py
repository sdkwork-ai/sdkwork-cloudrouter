from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_service_node_item import AdminServiceNodeItem


@dataclass
class AdminServiceNodesResponse:
    """Admin service nodes response schema exposed by Claw Router."""
    items: List[AdminServiceNodeItem]
