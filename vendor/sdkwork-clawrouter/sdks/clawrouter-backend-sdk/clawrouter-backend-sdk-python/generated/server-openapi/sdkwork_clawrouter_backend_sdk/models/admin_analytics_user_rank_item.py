from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_pie_chart_item import AdminPieChartItem


@dataclass
class AdminAnalyticsUserRankItem:
    """Admin analytics user rank item schema exposed by Claw Router."""
    model_distribution: List[AdminPieChartItem]
    points: float
    rank: str
    request_count: str
    total_tokens: float
    user_id: str
    user_name: str
    email: Optional[str] = None
