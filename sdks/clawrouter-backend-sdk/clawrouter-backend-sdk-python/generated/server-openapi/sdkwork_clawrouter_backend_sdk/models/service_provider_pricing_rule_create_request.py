from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ServiceProviderPricingRuleCreateRequest:
    """Service provider pricing rule create request schema exposed by Claw Router."""
    billing_meter_code: str
    buyer_provider_id: str
    minimum_charge: str
    seller_provider_id: str
    unit_price: str
    unit_size: str
    catalog_key: Optional[str] = None
    currency: Optional[str] = None
    edge_id: Optional[str] = None
    model: Optional[str] = None
    price_plan_id: Optional[str] = None
    priority: Optional[int] = None
    token_kind: Optional[str] = None
