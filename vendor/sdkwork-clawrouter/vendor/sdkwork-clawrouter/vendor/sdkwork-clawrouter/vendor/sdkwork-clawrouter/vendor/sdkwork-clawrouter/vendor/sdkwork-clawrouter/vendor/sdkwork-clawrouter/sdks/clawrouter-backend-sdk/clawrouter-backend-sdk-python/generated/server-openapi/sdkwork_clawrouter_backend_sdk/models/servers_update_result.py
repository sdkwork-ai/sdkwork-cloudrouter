from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_server_mutation_response import AdminMcpServerMutationResponse


@dataclass
class ServersUpdateResult:
    """Servers update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpServerMutationResponse] = None
    msg: Optional[str] = None
