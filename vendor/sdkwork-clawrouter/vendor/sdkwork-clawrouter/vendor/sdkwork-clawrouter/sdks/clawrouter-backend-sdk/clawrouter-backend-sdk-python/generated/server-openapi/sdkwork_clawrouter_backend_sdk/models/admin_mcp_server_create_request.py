from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpServerCreateRequest:
    """Admin mcp server create request schema exposed by Claw Router."""
    name: str
    server_key: str
    category_id: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    transport: Optional[str] = None
    visibility: Optional[str] = None
