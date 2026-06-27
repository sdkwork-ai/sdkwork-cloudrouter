from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_health_check_response import AdminMcpHealthCheckResponse


@dataclass
class ServersHealthChecksCreateResult:
    """Servers health checks create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpHealthCheckResponse] = None
    msg: Optional[str] = None
