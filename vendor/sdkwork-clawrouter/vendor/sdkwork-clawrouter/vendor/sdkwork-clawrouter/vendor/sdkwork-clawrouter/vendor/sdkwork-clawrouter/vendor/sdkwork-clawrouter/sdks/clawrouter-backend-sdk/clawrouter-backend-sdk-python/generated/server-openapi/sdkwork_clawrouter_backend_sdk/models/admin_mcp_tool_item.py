from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpToolItem:
    """Admin mcp tool item schema exposed by Claw Router."""
    created_at: str
    enabled: bool
    id: str
    input_schema: Dict[str, str]
    name: str
    organization_id: str
    output_schema: Dict[str, str]
    rate_limit_policy: Dict[str, str]
    requires_approval: bool
    risk_level: str
    schema_hash: str
    server_id: str
    sort_weight: int
    status: str
    tenant_id: str
    tool_key: str
    updated_at: str
    uuid: str
    description: Optional[str] = None
    discovered_at: Optional[str] = None
    last_invoked_at: Optional[str] = None
    server_revision_id: Optional[str] = None
