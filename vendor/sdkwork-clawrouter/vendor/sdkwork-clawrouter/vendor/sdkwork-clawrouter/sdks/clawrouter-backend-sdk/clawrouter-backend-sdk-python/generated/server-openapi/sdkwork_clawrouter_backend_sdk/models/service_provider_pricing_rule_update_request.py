from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ServiceProviderPricingRuleUpdateRequest:
    """Service provider pricing rule update request schema exposed by Claw Router."""
    minimum_charge: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    unit_price: Optional[str] = None
    unit_size: Optional[str] = None
