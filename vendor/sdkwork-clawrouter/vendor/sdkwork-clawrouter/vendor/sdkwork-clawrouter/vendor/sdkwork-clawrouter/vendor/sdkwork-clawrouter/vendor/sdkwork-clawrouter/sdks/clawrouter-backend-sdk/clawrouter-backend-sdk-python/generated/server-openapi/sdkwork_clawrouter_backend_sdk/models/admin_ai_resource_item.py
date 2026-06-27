from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_member_item import AdminAiResourceMemberItem


@dataclass
class AdminAiResourceItem:
    """Admin ai resource item schema exposed by Claw Router."""
    composition_mode: str
    display_name: str
    id: str
    members: List[AdminAiResourceMemberItem]
    resource_code: str
    resource_type: str
    status: str
    api_endpoint_code: Optional[str] = None
    capabilities: Optional[List[str]] = None
    capability: Optional[str] = None
    catalog_key: Optional[str] = None
    modality_code: Optional[str] = None
    model: Optional[str] = None
    provider_native_model: Optional[str] = None
    sort_order: Optional[str] = None
    vendor_code: Optional[str] = None
