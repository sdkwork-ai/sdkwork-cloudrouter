from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mapping_rule import AdminModelMappingRule


@dataclass
class AdminModelMappingResolveResponse:
    """Admin model mapping resolve response schema exposed by Claw Router."""
    matched: bool
    source_model: str
    target_model: str
    matched_binding_type: Optional[str] = None
    rule: Optional[AdminModelMappingRule] = None
    target_catalog_key: Optional[str] = None
    target_provider_model: Optional[str] = None
    target_provider_native_model: Optional[str] = None
    target_vendor_code: Optional[str] = None
