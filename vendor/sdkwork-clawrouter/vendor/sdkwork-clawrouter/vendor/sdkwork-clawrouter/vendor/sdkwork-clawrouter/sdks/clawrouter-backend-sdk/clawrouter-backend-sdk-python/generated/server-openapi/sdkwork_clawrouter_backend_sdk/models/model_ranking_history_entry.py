from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ModelRankingHistoryEntry:
    """Model ranking history entry schema exposed by Claw Router."""
    catalog_key: str
    color: str
    model: str
    rank: str
    volume: str
