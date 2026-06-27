from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_server_revision_list_response import AdminMcpServerRevisionListResponse


@dataclass
class ServersRevisionsListResult:
    """Servers revisions list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpServerRevisionListResponse] = None
    msg: Optional[str] = None
