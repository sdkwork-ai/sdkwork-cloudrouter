from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpBindingCreateRequest:
    """Admin mcp binding create request schema exposed by Claw Router."""
    owner_id: str
    owner_type: str
    allowed_tools: Optional[List[str]] = None
    denied_tools: Optional[List[str]] = None
    enabled: Optional[bool] = None
    policy_json: Optional[Dict[str, str]] = None
    priority: Optional[int] = None
    server_revision_id: Optional[str] = None
    status: Optional[str] = None
    tool_id: Optional[str] = None
