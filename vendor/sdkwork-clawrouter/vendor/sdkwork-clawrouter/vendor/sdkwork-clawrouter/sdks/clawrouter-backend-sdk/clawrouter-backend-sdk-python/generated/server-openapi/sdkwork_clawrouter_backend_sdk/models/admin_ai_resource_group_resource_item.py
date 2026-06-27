from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAiResourceGroupResourceItem:
    """Admin ai resource group resource item schema exposed by Claw Router."""
    display_name: str
    id: str
    member_role: str
    resource_code: str
    resource_type: str
    status: str
    api_endpoint_code: Optional[str] = None
    catalog_key: Optional[str] = None
    modality_code: Optional[str] = None
    model: Optional[str] = None
    provider_native_model: Optional[str] = None
    sort_order: Optional[str] = None
    vendor_code: Optional[str] = None
