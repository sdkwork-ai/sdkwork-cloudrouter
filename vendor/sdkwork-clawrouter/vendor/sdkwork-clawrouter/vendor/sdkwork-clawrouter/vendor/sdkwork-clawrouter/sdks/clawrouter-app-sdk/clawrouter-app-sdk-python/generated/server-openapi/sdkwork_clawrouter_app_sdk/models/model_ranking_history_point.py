from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .model_ranking_history_entry import ModelRankingHistoryEntry


@dataclass
class ModelRankingHistoryPoint:
    """Model ranking history point schema exposed by Claw Router."""
    date: str
    entries: List[ModelRankingHistoryEntry]
    index: str
