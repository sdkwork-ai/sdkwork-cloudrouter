from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .model_ranking_refresh_status import ModelRankingRefreshStatus


@dataclass
class ModelRankingsStatusRetrieveResult:
    """Model rankings status retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[ModelRankingRefreshStatus] = None
    msg: Optional[str] = None
