from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ModelRankingRefreshTriggerRequest:
    """Model ranking refresh trigger request schema exposed by Claw Router."""
    cache_max_age_seconds: Optional[str] = None
    limit: Optional[str] = None
    lookback_days: Optional[str] = None
    rank_scope: Optional[str] = None
    refresh_interval_seconds: Optional[str] = None
    snapshot_period: Optional[str] = None
