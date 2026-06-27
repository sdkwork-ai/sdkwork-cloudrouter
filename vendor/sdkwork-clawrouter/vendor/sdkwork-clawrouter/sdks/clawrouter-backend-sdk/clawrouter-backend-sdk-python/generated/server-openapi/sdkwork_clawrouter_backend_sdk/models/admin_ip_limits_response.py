from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_rate_limit_item import AdminRateLimitItem


@dataclass
class AdminIpLimitsResponse:
    """Admin ip limits response schema exposed by Claw Router."""
    items: List[AdminRateLimitItem]
