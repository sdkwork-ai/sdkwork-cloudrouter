from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_mcp_binding_item import AdminMcpBindingItem


@dataclass
class AdminMcpBindingListResponse:
    """Admin mcp binding list response schema exposed by Claw Router."""
    items: List[AdminMcpBindingItem]
