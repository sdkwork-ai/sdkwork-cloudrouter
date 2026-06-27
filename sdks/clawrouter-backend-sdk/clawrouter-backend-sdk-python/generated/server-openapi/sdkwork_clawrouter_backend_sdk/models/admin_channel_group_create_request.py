from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminChannelGroupCreateRequest:
    """Admin channel group create request schema exposed by Claw Router."""
    group_code: str
    group_name: str
    group_type: str
    price_reference_mode: str
    status: str
    capacity: Optional[Dict[str, Any]] = None
    official_price_multiplier: Optional[float] = None
    rate_multiplier: Optional[float] = None
    resource_codes: Optional[List[str]] = None
    resource_group_codes: Optional[List[str]] = None
