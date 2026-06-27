from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_referral_stat_item import AdminReferralStatItem


@dataclass
class AdminReferralStatsResponse:
    """Admin referral stats response schema exposed by Claw Router."""
    items: List[AdminReferralStatItem]
