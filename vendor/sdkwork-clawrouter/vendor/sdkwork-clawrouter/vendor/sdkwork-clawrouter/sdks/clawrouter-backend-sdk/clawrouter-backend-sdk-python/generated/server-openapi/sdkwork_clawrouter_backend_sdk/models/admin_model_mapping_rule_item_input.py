from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminModelMappingRuleItemInput:
    """Admin model mapping rule item input schema exposed by Claw Router."""
    source_model: str
    target_model: str
    enabled: Optional[bool] = None
    id: Optional[str] = None
    source_catalog_key: Optional[str] = None
    target_catalog_key: Optional[str] = None
    target_provider_model: Optional[str] = None
    target_provider_native_model: Optional[str] = None
