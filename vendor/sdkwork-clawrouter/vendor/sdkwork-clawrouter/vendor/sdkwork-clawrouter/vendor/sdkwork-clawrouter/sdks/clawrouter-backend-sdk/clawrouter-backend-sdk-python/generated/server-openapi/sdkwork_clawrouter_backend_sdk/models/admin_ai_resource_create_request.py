from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_member_input import AdminAiResourceMemberInput


@dataclass
class AdminAiResourceCreateRequest:
    """Admin ai resource create request schema exposed by Claw Router."""
    display_name: str
    resource_code: str
    resource_type: str
    api_endpoint_code: Optional[str] = None
    catalog_key: Optional[str] = None
    composition_mode: Optional[str] = None
    members: Optional[List[AdminAiResourceMemberInput]] = None
    modality_code: Optional[str] = None
    model: Optional[str] = None
    provider_native_model: Optional[str] = None
    sort_order: Optional[str] = None
    status: Optional[str] = None
    vendor_code: Optional[str] = None
