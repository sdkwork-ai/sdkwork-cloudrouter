from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_analytics_insight import AdminAnalyticsInsight
    from .admin_analytics_model_rankings import AdminAnalyticsModelRankings
    from .admin_analytics_summary import AdminAnalyticsSummary
    from .admin_analytics_trend_point import AdminAnalyticsTrendPoint
    from .admin_analytics_user_rankings import AdminAnalyticsUserRankings
    from .admin_pie_chart_item import AdminPieChartItem


@dataclass
class AdminAnalyticsOverviewResponse:
    """Admin analytics overview response schema exposed by Claw Router."""
    insights: List[AdminAnalyticsInsight]
    limit: str
    modality_distribution: List[AdminPieChartItem]
    model_distribution: List[AdminPieChartItem]
    model_rankings: AdminAnalyticsModelRankings
    summary: AdminAnalyticsSummary
    time_range: str
    trend: List[AdminAnalyticsTrendPoint]
    user_rankings: AdminAnalyticsUserRankings
    end_time: Optional[str] = None
    start_time: Optional[str] = None
