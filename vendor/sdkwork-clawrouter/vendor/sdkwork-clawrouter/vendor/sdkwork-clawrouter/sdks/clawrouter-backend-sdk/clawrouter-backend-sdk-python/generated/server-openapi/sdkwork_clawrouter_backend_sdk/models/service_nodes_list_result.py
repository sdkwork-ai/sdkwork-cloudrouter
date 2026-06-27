from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_service_nodes_response import AdminServiceNodesResponse


@dataclass
class ServiceNodesListResult:
    """Service nodes list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminServiceNodesResponse] = None
    msg: Optional[str] = None
