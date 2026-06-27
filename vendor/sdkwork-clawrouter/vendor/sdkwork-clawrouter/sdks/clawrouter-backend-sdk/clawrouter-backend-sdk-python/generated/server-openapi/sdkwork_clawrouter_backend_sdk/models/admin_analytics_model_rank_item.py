from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAnalyticsModelRankItem:
    """Admin analytics model rank item schema exposed by Claw Router."""
    average_tokens_per_request: float
    catalog_key: str
    error_rate: float
    modality: str
    model: str
    points: float
    rank: str
    request_count: str
    total_tokens: float
    upstream_cost: float
    user_count: str
    vendor: str
