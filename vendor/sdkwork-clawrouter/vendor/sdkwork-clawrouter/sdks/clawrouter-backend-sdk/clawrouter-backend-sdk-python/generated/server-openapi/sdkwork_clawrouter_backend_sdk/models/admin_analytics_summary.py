from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAnalyticsSummary:
    """Admin analytics summary schema exposed by Claw Router."""
    active_models: str
    active_users: str
    average_points_per_request: float
    average_tokens_per_request: float
    error_rate: float
    failed_requests: str
    successful_requests: str
    total_points: float
    total_requests: str
    total_tokens: float
    total_users: str
    upstream_cost: float
