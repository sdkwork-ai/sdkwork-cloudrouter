from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .routing_model_stats import RoutingModelStats
    from .routing_usage_data import RoutingUsageData


@dataclass
class RoutingUsageSnapshot:
    """Routing usage snapshot schema exposed by Claw Router."""
    chart_data: List[RoutingUsageData]
    model_stats: List[RoutingModelStats]
