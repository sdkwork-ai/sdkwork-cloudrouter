from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_dashboard_recent_usage_item import AdminDashboardRecentUsageItem
    from .admin_dashboard_traffic_item import AdminDashboardTrafficItem
    from .admin_pie_chart_item import AdminPieChartItem


@dataclass
class AdminDashboardDataResponse:
    """Admin dashboard data response schema exposed by Claw Router."""
    active_users: str
    model_distribution: List[AdminPieChartItem]
    multimodal: List[AdminPieChartItem]
    recent_usage: List[AdminDashboardRecentUsageItem]
    traffic: List[AdminDashboardTrafficItem]
    user_consumption: List[AdminPieChartItem]
