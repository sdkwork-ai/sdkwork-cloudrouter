from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_server_revision_item import AdminMcpServerRevisionItem


@dataclass
class AdminMcpServerRevisionListResponse:
    """Admin mcp server revision list response schema exposed by Claw Router."""
    items: List[AdminMcpServerRevisionItem]
