from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_runtime_route_explain_response import AdminRuntimeRouteExplainResponse


@dataclass
class RouteExplainCreateResult:
    """Route explain create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminRuntimeRouteExplainResponse] = None
    msg: Optional[str] = None
