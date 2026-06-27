from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .model_ranking_refresh_trigger_response import ModelRankingRefreshTriggerResponse


@dataclass
class ModelRankingsRefreshResult:
    """Model rankings refresh result schema exposed by Claw Router."""
    code: str
    data: Optional[ModelRankingRefreshTriggerResponse] = None
    msg: Optional[str] = None
