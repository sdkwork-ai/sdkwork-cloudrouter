from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ServiceProviderPriceSimulationRequest:
    """Service provider price simulation request schema exposed by Claw Router."""
    billing_meter_code: str
    buyer_provider_id: str
    quantity: str
    catalog_key: Optional[str] = None
    model: Optional[str] = None
    token_kind: Optional[str] = None
