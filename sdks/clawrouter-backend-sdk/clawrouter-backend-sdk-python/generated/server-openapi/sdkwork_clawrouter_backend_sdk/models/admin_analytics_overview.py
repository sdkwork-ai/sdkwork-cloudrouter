from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAnalyticsOverview:
    """Admin analytics overview schema exposed by Claw Router."""
    insights: List[Dict[str, Any]]
    modality_distribution: List[Dict[str, Any]]
    model_distribution: List[Dict[str, Any]]
    model_rankings: Dict[str, Any]
    ranking_size: int
    summary: Dict[str, Any]
    time_range: str
    trend: List[Dict[str, Any]]
    user_rankings: Dict[str, Any]
    end_time: Optional[str] = None
    start_time: Optional[str] = None
