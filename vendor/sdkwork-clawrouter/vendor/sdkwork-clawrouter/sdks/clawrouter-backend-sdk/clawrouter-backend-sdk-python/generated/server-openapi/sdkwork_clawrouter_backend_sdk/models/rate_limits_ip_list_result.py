from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ip_limits_response import AdminIpLimitsResponse


@dataclass
class RateLimitsIpListResult:
    """Rate limits ip list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminIpLimitsResponse] = None
    msg: Optional[str] = None
