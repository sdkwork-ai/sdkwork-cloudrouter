from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminReferralStatItem:
    """Admin referral stat item schema exposed by Claw Router."""
    bonus_awarded: str
    id: str
    inviter: str
    link: str
    total_invited: str
    total_revenue: str
