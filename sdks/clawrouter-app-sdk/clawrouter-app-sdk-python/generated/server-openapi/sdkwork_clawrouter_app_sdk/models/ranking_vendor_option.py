from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RankingVendorOption:
    """Ranking vendor option schema exposed by Claw Router."""
    code: str
    label: str
    model_count: str
