from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminPromptBindingCreateRequest:
    """Admin prompt binding create request schema exposed by Claw Router."""
    binding_role: str
    owner_id: str
    owner_type: str
    enabled: Optional[bool] = None
    policy_json: Optional[Dict[str, str]] = None
    priority: Optional[int] = None
    prompt_version_id: Optional[str] = None
