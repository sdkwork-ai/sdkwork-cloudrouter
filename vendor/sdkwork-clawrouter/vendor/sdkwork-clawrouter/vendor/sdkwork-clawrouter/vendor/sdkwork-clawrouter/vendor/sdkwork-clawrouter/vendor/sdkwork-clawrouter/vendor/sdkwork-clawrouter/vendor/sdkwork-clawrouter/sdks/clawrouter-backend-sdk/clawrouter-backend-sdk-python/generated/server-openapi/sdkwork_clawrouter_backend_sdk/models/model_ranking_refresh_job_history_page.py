from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .model_ranking_refresh_job_item import ModelRankingRefreshJobItem


@dataclass
class ModelRankingRefreshJobHistoryPage:
    """Model ranking refresh job history page schema exposed by Claw Router."""
    items: List[ModelRankingRefreshJobItem]
