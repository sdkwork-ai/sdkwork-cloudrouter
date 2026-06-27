from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_tool_list_response import AdminMcpToolListResponse


@dataclass
class ServersToolsListResult:
    """Servers tools list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpToolListResponse] = None
    msg: Optional[str] = None
