from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ModelRankingRefreshJobItem:
    """Model ranking refresh job item schema exposed by Claw Router."""
    duration_ms: str
    ended_at: str
    failure_count: str
    failure_reason: Optional[str]
    generated_count: str
    id: str
    job_name: str
    next_refresh_at: str
    organization_id: str
    rank_scope: str
    snapshot_date: str
    snapshot_period: str
    source_count: str
    started_at: str
    status: str
    success_count: str
    tenant_id: str
    window_end: str
    window_start: str
