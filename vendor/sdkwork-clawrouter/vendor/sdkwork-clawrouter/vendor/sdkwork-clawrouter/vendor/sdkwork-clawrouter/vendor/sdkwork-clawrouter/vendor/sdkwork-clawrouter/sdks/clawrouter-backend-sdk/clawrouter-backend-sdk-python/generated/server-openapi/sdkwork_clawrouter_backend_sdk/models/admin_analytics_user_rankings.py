from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_analytics_user_rank_item import AdminAnalyticsUserRankItem


@dataclass
class AdminAnalyticsUserRankings:
    """Admin analytics user rankings schema exposed by Claw Router."""
    points: List[AdminAnalyticsUserRankItem]
    requests: List[AdminAnalyticsUserRankItem]
    tokens: List[AdminAnalyticsUserRankItem]
