from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_analytics_model_rank_item import AdminAnalyticsModelRankItem


@dataclass
class AdminAnalyticsModelRankings:
    """Admin analytics model rankings schema exposed by Claw Router."""
    points: List[AdminAnalyticsModelRankItem]
    requests: List[AdminAnalyticsModelRankItem]
    tokens: List[AdminAnalyticsModelRankItem]
