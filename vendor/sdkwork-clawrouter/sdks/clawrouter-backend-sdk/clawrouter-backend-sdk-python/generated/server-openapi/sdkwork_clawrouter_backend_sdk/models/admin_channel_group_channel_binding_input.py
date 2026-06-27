from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminChannelGroupChannelBindingInput:
    """Admin channel group channel binding input schema exposed by Claw Router."""
    channel_id: str
    api_scope: Optional[List[str]] = None
    capabilities: Optional[List[str]] = None
    priority: Optional[int] = None
    resource_codes: Optional[List[str]] = None
    status: Optional[str] = None
    weight: Optional[int] = None
