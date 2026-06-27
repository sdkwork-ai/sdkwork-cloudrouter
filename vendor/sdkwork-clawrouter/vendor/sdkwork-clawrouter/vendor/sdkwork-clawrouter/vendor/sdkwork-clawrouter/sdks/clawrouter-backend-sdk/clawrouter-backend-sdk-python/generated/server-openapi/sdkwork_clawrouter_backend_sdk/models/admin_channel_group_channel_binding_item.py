from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminChannelGroupChannelBindingItem:
    """Admin channel group channel binding item schema exposed by Claw Router."""
    api_scope: List[str]
    capabilities: List[str]
    channel_code: str
    channel_group_id: str
    channel_id: str
    channel_name: str
    health_status: str
    id: str
    priority: int
    provider_code: str
    provider_name: str
    resource_codes: List[str]
    status: str
    weight: int
