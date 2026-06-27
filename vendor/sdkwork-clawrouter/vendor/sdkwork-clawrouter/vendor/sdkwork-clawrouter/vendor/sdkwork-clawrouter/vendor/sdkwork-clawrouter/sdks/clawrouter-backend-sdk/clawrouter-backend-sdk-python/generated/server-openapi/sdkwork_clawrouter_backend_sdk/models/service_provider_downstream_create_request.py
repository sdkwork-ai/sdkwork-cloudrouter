from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ServiceProviderDownstreamCreateRequest:
    """Service provider downstream create request schema exposed by Claw Router."""
    display_name: str
    provider_no: str
    seller_provider_id: str
    default_currency: Optional[str] = None
    default_multiplier: Optional[str] = None
    price_plan_code: Optional[str] = None
    provider_type: Optional[str] = None
    settlement_mode: Optional[str] = None
