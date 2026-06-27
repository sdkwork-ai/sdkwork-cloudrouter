from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_service_node_delete_response import AdminServiceNodeDeleteResponse


@dataclass
class ServiceNodesDeleteResult:
    """Service nodes delete result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminServiceNodeDeleteResponse] = None
    msg: Optional[str] = None
