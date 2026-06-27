from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpBindingUpdateRequest:
    """Admin mcp binding update request schema exposed by Claw Router."""
    allowed_tools: Optional[List[str]] = None
    denied_tools: Optional[List[str]] = None
    enabled: Optional[bool] = None
    owner_id: Optional[str] = None
    owner_type: Optional[str] = None
    policy_json: Optional[Dict[str, str]] = None
    priority: Optional[int] = None
    server_revision_id: Optional[str] = None
    status: Optional[str] = None
    tool_id: Optional[str] = None
