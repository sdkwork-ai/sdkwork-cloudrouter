from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpBindingItem:
    """Admin mcp binding item schema exposed by Claw Router."""
    allowed_tools: List[str]
    created_at: str
    denied_tools: List[str]
    enabled: bool
    id: str
    organization_id: str
    owner_id: str
    owner_type: str
    policy_json: Dict[str, str]
    priority: int
    server_id: str
    snapshot_json: Dict[str, str]
    status: str
    tenant_id: str
    updated_at: str
    uuid: str
    server_revision_id: Optional[str] = None
    tool_id: Optional[str] = None
