from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .service_provider_pricing_rule_mutation_response import ServiceProviderPricingRuleMutationResponse


@dataclass
class PricingRulesUpdateResult:
    """Pricing rules update result schema exposed by Claw Router."""
    code: str
    data: Optional[ServiceProviderPricingRuleMutationResponse] = None
    msg: Optional[str] = None
