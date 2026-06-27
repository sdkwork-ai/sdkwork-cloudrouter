from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminPromptItem:
    """Admin prompt item schema exposed by Claw Router."""
    created_at: str
    id: str
    name: str
    organization_id: str
    prompt_key: str
    prompt_type: str
    status: str
    tags: List[str]
    tenant_id: str
    updated_at: str
    uuid: str
    visibility: str
    category_code: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    latest_version_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    published_version_id: Optional[str] = None
