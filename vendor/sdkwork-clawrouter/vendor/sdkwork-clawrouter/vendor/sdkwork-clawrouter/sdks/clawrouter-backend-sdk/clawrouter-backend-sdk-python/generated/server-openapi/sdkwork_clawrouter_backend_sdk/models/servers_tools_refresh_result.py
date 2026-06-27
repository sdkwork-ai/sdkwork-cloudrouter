from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_discovery_response import AdminMcpDiscoveryResponse


@dataclass
class ServersToolsRefreshResult:
    """Servers tools refresh result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpDiscoveryResponse] = None
    msg: Optional[str] = None
