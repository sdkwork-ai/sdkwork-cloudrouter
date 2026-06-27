from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminChannelGroupUpdateRequest:
    """Admin channel group update request schema exposed by Claw Router."""
    capacity: Optional[Dict[str, Any]] = None
    group_code: Optional[str] = None
    group_name: Optional[str] = None
    group_type: Optional[str] = None
    official_price_multiplier: Optional[float] = None
    price_reference_mode: Optional[str] = None
    rate_multiplier: Optional[float] = None
    resource_codes: Optional[List[str]] = None
    resource_group_codes: Optional[List[str]] = None
    status: Optional[str] = None
