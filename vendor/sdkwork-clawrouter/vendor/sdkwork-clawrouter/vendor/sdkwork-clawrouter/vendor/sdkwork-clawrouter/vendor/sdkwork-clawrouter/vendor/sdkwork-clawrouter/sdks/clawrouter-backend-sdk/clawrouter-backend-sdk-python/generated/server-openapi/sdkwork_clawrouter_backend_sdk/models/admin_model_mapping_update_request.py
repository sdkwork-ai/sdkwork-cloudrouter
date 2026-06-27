from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_mapping_rule_binding_input import AdminModelMappingRuleBindingInput
    from .admin_model_mapping_rule_item_input import AdminModelMappingRuleItemInput


@dataclass
class AdminModelMappingUpdateRequest:
    """Admin model mapping update request schema exposed by Claw Router."""
    bindings: Optional[List[AdminModelMappingRuleBindingInput]] = None
    enabled: Optional[bool] = None
    mapping_items: Optional[List[AdminModelMappingRuleItemInput]] = None
    mapping_mode: Optional[str] = None
    match_type: Optional[str] = None
    source_vendor_code: Optional[str] = None
    source_vendor_id: Optional[str] = None
    target_vendor_code: Optional[str] = None
    target_vendor_id: Optional[str] = None
