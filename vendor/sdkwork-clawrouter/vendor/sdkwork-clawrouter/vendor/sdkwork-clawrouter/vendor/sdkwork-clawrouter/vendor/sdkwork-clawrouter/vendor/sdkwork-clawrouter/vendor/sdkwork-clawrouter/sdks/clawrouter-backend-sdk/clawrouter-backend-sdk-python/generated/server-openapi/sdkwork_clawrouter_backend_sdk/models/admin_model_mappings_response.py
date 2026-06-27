from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mapping_rule import AdminModelMappingRule


@dataclass
class AdminModelMappingsResponse:
    """Admin model mappings response schema exposed by Claw Router."""
    items: List[AdminModelMappingRule]
