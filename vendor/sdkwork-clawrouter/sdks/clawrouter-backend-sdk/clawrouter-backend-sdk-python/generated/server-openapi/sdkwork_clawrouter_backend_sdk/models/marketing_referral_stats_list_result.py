from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_referral_stats_response import AdminReferralStatsResponse


@dataclass
class MarketingReferralStatsListResult:
    """Marketing referral stats list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminReferralStatsResponse] = None
    msg: Optional[str] = None
