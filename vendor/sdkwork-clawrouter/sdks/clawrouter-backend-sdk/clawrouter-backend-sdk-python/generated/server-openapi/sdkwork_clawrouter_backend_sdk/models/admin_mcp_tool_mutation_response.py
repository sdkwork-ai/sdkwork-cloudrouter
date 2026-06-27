from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_tool_item import AdminMcpToolItem


@dataclass
class AdminMcpToolMutationResponse:
    """Admin mcp tool mutation response schema exposed by Claw Router."""
    item: AdminMcpToolItem
