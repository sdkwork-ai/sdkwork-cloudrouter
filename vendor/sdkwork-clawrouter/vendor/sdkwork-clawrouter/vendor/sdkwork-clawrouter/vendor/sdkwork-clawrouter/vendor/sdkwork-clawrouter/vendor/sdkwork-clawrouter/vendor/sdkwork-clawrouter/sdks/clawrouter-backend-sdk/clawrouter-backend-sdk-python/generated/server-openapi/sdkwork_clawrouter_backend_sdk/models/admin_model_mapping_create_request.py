from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mapping_rule_binding_input import AdminModelMappingRuleBindingInput
    from .admin_model_mapping_rule_item_input import AdminModelMappingRuleItemInput


@dataclass
class AdminModelMappingCreateRequest:
    """Admin model mapping create request schema exposed by Claw Router."""
    bindings: List[AdminModelMappingRuleBindingInput]
    mapping_items: List[AdminModelMappingRuleItemInput]
    source_vendor_code: str
    target_vendor_code: str
    enabled: Optional[bool] = None
    mapping_mode: Optional[str] = None
    match_type: Optional[str] = None
    source_vendor_id: Optional[str] = None
    target_vendor_id: Optional[str] = None
