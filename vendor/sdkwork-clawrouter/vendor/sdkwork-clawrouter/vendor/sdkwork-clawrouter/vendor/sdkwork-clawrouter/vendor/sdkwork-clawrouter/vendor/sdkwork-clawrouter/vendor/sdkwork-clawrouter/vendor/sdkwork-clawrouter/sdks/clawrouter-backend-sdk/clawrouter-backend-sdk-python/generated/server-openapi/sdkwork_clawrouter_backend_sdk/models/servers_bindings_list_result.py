from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_binding_list_response import AdminMcpBindingListResponse


@dataclass
class ServersBindingsListResult:
    """Servers bindings list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpBindingListResponse] = None
    msg: Optional[str] = None
