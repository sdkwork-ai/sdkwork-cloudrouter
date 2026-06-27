from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminPromptBindingUpdateRequest:
    """Admin prompt binding update request schema exposed by Claw Router."""
    binding_role: Optional[str] = None
    enabled: Optional[bool] = None
    owner_id: Optional[str] = None
    owner_type: Optional[str] = None
    policy_json: Optional[Dict[str, str]] = None
    priority: Optional[int] = None
    prompt_version_id: Optional[str] = None
