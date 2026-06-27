from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminModelMappingRuleBindingInput:
    """Admin model mapping rule binding input schema exposed by Claw Router."""
    binding_type: str
    binding_code: Optional[str] = None
    binding_id: Optional[str] = None
    binding_name: Optional[str] = None
    enabled: Optional[bool] = None
    id: Optional[str] = None
