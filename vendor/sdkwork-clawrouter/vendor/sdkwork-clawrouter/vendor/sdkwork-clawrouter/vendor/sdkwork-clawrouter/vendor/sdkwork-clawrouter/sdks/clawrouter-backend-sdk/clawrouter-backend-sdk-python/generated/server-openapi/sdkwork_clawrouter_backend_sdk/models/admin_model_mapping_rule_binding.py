from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminModelMappingRuleBinding:
    """Admin model mapping rule binding schema exposed by Claw Router."""
    binding_type: str
    enabled: bool
    id: str
    sort_order: str
    binding_code: Optional[str] = None
    binding_id: Optional[str] = None
    binding_name: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
