from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminModelMappingRuleItem:
    """Admin model mapping rule item schema exposed by Claw Router."""
    enabled: bool
    id: str
    sort_order: str
    source_model: str
    target_model: str
    created_at: Optional[str] = None
    source_catalog_key: Optional[str] = None
    target_catalog_key: Optional[str] = None
    target_provider_model: Optional[str] = None
    target_provider_native_model: Optional[str] = None
    updated_at: Optional[str] = None
