from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mapping_rule_binding import AdminModelMappingRuleBinding
    from .admin_model_mapping_rule_item import AdminModelMappingRuleItem


@dataclass
class AdminModelMappingRule:
    """Admin model mapping rule schema exposed by Claw Router."""
    binding_type: str
    bindings: List[AdminModelMappingRuleBinding]
    enabled: bool
    id: str
    mapping_items: List[AdminModelMappingRuleItem]
    mapping_mode: str
    match_type: str
    source_vendor_code: str
    target_vendor_code: str
    created_at: Optional[str] = None
    source_vendor_id: Optional[str] = None
    target_vendor_id: Optional[str] = None
    updated_at: Optional[str] = None
