from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ModelRankingItem:
    """Model ranking item schema exposed by Claw Router."""
    base_volume: str
    color: str
    cost: float
    cost_indicator: str
    currency: str
    id: str
    is_new: bool
    latency: str
    modality: str
    name: str
    prev_rank: str
    rank: str
    requests: str
    strengths: List[str]
    tokens: str
    vendor: str
    vendor_code: str
    context_size: Optional[str] = None
    license: Optional[str] = None
    pricing: Optional[str] = None
    trend_score: Optional[float] = None
    win_rate: Optional[float] = None
