from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminRuntimeRouteExplainRequest:
    """Admin runtime route explain request schema exposed by Claw Router."""
    api_key_id: str
    api_code: Optional[str] = None
    billing_meter: Optional[str] = None
    capability: Optional[str] = None
    catalog_key: Optional[str] = None
    channel_group_id: Optional[str] = None
    model: Optional[str] = None
    resource_code: Optional[str] = None
    route_key: Optional[str] = None
