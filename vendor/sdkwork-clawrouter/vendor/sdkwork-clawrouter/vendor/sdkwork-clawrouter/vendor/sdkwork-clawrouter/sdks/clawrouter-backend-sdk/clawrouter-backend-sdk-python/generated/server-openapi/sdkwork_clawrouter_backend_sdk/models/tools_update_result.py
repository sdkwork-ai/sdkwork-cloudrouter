from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_tool_mutation_response import AdminMcpToolMutationResponse


@dataclass
class ToolsUpdateResult:
    """Tools update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminMcpToolMutationResponse] = None
    msg: Optional[str] = None
