from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .model_ranking_refresh_job_history_page import ModelRankingRefreshJobHistoryPage


@dataclass
class ModelRankingsJobsListResult:
    """Model rankings jobs list result schema exposed by Claw Router."""
    code: int
    data: Any
    trace_id: str
