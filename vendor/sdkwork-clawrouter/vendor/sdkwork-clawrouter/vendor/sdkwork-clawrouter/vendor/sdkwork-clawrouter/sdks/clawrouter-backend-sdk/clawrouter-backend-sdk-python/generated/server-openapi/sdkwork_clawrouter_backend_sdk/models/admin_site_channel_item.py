from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminSiteChannelItem:
    """Admin site channel item schema exposed by Claw Router."""
    channel_code: str
    channel_name: str
    health_status: str
    id: str
    status: str
    provider_code: Optional[str] = None
    site_channel_role: Optional[str] = None
    site_code: Optional[str] = None
    site_service_code: Optional[str] = None
