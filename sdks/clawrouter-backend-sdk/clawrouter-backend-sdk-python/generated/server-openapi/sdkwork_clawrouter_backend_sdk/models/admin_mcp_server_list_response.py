from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_server_item import AdminMcpServerItem


@dataclass
class AdminMcpServerListResponse:
    """Admin mcp server list response schema exposed by Claw Router."""
    items: List[AdminMcpServerItem]
