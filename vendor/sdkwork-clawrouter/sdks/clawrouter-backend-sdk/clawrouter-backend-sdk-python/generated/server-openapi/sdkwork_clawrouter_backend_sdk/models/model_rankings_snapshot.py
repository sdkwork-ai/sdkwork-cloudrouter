from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .model_ranking_history_point import ModelRankingHistoryPoint
    from .model_ranking_item import ModelRankingItem
    from .model_rankings_source import ModelRankingsSource


@dataclass
class ModelRankingsSnapshot:
    """Model rankings snapshot schema exposed by Claw Router."""
    history: List[ModelRankingHistoryPoint]
    items: List[ModelRankingItem]
    source: ModelRankingsSource
