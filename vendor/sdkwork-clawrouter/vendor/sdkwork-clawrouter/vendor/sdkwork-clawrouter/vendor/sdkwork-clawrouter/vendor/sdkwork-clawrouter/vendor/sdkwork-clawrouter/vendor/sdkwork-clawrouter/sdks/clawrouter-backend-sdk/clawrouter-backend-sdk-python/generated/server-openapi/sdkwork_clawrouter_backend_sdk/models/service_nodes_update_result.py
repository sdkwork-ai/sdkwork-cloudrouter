from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_service_node_mutation_response import AdminServiceNodeMutationResponse


@dataclass
class ServiceNodesUpdateResult:
    """Service nodes update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminServiceNodeMutationResponse] = None
    msg: Optional[str] = None
