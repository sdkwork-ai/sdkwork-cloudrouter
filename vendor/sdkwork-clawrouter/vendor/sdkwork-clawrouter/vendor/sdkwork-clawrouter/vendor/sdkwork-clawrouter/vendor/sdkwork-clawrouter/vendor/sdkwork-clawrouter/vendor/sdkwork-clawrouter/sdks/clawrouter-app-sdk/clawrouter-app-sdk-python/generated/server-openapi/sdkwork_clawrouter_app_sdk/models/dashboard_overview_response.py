from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .dashboard_announcement import DashboardAnnouncement
    from .dashboard_chart_point import DashboardChartPoint
    from .dashboard_configuration_domain import DashboardConfigurationDomain
    from .dashboard_overview_summary import DashboardOverviewSummary
    from .dashboard_sparkline_point import DashboardSparklinePoint
    from .dashboard_top_model import DashboardTopModel


@dataclass
class DashboardOverviewResponse:
    """Dashboard overview response schema exposed by Claw Router."""
    announcements: List[DashboardAnnouncement]
    chart_data: List[DashboardChartPoint]
    multimodal_sparkline: List[DashboardSparklinePoint]
    performance_sparkline: List[DashboardSparklinePoint]
    request_sparkline: List[DashboardSparklinePoint]
    summary: DashboardOverviewSummary
    top_models: List[DashboardTopModel]
    warnings: List[str]
    configuration_domains: Optional[List[DashboardConfigurationDomain]] = None
