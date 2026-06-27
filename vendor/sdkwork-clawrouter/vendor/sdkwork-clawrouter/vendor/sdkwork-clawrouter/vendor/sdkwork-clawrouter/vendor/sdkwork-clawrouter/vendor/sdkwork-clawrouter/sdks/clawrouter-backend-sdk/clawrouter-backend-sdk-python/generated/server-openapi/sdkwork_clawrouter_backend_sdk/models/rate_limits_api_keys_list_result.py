from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_token_limits_response import AdminTokenLimitsResponse


@dataclass
class RateLimitsApiKeysListResult:
    """Rate limits api keys list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminTokenLimitsResponse] = None
    msg: Optional[str] = None
