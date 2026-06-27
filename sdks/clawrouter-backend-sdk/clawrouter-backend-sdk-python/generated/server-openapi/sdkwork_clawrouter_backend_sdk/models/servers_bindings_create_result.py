from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_binding_mutation_response import AdminMcpBindingMutationResponse


@dataclass
class ServersBindingsCreateResult:
    """Servers bindings create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpBindingMutationResponse] = None
    msg: Optional[str] = None
