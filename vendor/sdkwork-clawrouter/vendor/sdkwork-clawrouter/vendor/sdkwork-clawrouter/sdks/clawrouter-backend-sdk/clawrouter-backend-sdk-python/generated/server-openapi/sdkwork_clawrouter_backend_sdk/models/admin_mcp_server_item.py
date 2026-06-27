from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpServerItem:
    """Admin mcp server item schema exposed by Claw Router."""
    created_at: str
    health_status: str
    id: str
    name: str
    organization_id: str
    server_key: str
    status: str
    tags: List[str]
    tenant_id: str
    transport: str
    updated_at: str
    uuid: str
    visibility: str
    category_code: Optional[str] = None
    category_id: Optional[str] = None
    deprecated_at: Optional[str] = None
    description: Optional[str] = None
    last_checked_at: Optional[str] = None
    last_error_masked: Optional[str] = None
    latest_revision_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    published_at: Optional[str] = None
    published_revision_id: Optional[str] = None
