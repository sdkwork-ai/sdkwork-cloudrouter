from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .model_rankings_snapshot import ModelRankingsSnapshot


@dataclass
class ModelRankingsListResult:
    """Model rankings list result schema exposed by Claw Router."""
    code: str
    data: Optional[ModelRankingsSnapshot] = None
    msg: Optional[str] = None
