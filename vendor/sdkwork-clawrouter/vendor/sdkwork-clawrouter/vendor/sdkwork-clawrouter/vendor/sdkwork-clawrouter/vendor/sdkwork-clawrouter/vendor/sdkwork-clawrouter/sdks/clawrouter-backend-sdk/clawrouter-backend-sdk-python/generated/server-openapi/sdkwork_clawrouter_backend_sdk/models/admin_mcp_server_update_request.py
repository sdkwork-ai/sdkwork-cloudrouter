from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpServerUpdateRequest:
    """Admin mcp server update request schema exposed by Claw Router."""
    category_id: Optional[str] = None
    description: Optional[str] = None
    name: Optional[str] = None
    server_key: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    transport: Optional[str] = None
    visibility: Optional[str] = None
