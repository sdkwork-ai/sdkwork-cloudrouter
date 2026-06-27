from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminPromptBindingItem:
    """Admin prompt binding item schema exposed by Claw Router."""
    binding_role: str
    created_at: str
    enabled: bool
    id: str
    organization_id: str
    owner_id: str
    owner_type: str
    policy_json: Dict[str, str]
    priority: int
    prompt_id: str
    snapshot_json: Dict[str, str]
    tenant_id: str
    updated_at: str
    uuid: str
    prompt_version_id: Optional[str] = None
