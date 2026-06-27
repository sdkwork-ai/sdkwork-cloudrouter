from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ModelRankingsSource:
    """Model rankings source schema exposed by Claw Router."""
    cache_max_age_seconds: str
    generated_at: str
    next_refresh_at: str
    observed_at: str
    rank_scope: str
    refresh_interval_seconds: str
    snapshot_date: str
    snapshot_period: str
    source_description: str
    source_label: str
    source_tables: List[str]
    window_end: str
    window_start: str
