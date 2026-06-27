from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_limits_response import AdminModelLimitsResponse


@dataclass
class RateLimitsModelsListResult:
    """Rate limits models list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminModelLimitsResponse] = None
    msg: Optional[str] = None
