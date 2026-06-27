from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .model_ranking_refresh_latest_job import ModelRankingRefreshLatestJob


@dataclass
class ModelRankingRefreshStatus:
    """Model ranking refresh status schema exposed by Claw Router."""
    cache_max_age_seconds: str
    generated_at: str
    generated_count: str
    latest_job: ModelRankingRefreshLatestJob
    next_refresh_at: str
    organization_id: str
    rank_scope: str
    refresh_interval_seconds: str
    snapshot_date: str
    snapshot_period: str
    source_count: str
    source_tables: List[str]
    status: str
    tenant_id: str
    window_end: str
    window_start: str
