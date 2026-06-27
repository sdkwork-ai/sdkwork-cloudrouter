from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ModelRankingRefreshTriggerResponse:
    """Model ranking refresh trigger response schema exposed by Claw Router."""
    cache_max_age_seconds: str
    generated_count: str
    next_refresh_at: str
    organization_id: str
    rank_scope: str
    refresh_interval_seconds: str
    snapshot_date: str
    snapshot_period: str
    source_count: str
    status: str
    tenant_id: str
    triggered: bool
    window_end: str
    window_start: str
