from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_rate_limit_mutation_response import AdminRateLimitMutationResponse


@dataclass
class RateLimitsModelsCreateResult:
    """Rate limits models create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminRateLimitMutationResponse] = None
    msg: Optional[str] = None
