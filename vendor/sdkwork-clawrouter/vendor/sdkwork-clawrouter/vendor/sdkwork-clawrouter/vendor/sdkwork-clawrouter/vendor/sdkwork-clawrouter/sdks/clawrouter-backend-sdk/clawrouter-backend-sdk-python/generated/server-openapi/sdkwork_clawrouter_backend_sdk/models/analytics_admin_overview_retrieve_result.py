from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_analytics_overview_response import AdminAnalyticsOverviewResponse


@dataclass
class AnalyticsAdminOverviewRetrieveResult:
    """Analytics admin overview retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAnalyticsOverviewResponse] = None
    msg: Optional[str] = None
