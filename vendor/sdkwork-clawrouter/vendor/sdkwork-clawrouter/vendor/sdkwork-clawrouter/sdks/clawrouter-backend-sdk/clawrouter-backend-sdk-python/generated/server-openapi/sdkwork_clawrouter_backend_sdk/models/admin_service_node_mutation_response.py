from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_service_node_item import AdminServiceNodeItem


@dataclass
class AdminServiceNodeMutationResponse:
    """Admin service node mutation response schema exposed by Claw Router."""
    item: AdminServiceNodeItem
