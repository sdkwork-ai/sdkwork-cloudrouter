from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_rate_limit_item import AdminRateLimitItem


@dataclass
class AdminRateLimitMutationResponse:
    """Admin rate limit mutation response schema exposed by Claw Router."""
    item: AdminRateLimitItem
