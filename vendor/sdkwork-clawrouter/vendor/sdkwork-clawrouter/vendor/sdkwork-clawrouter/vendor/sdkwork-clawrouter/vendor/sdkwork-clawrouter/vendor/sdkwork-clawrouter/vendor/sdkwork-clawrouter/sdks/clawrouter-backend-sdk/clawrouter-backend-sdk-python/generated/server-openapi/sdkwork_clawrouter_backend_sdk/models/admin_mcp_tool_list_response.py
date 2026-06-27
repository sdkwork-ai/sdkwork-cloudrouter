from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_tool_item import AdminMcpToolItem


@dataclass
class AdminMcpToolListResponse:
    """Admin mcp tool list response schema exposed by Claw Router."""
    items: List[AdminMcpToolItem]
