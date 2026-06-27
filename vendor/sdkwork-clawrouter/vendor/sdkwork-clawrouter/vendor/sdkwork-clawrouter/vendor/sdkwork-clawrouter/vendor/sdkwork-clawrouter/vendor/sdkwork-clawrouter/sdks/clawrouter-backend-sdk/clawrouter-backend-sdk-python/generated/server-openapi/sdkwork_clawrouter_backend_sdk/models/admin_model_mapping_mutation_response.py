from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mapping_rule import AdminModelMappingRule


@dataclass
class AdminModelMappingMutationResponse:
    """Admin model mapping mutation response schema exposed by Claw Router."""
    item: AdminModelMappingRule
