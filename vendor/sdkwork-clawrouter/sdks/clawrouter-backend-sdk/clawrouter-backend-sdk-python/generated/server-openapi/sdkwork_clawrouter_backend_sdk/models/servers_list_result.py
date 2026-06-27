from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_server_list_response import AdminMcpServerListResponse


@dataclass
class ServersListResult:
    """Servers list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpServerListResponse] = None
    msg: Optional[str] = None
