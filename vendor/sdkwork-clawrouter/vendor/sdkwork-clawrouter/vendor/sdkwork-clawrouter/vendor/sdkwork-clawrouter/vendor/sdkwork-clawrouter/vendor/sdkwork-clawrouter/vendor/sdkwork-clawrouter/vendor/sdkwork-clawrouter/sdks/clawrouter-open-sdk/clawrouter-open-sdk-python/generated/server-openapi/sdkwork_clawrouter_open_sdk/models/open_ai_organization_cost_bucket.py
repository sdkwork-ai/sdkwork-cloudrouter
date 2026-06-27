from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationCostBucket:
    """OpenAI-compatible organization cost bucket."""
    amount: Optional[float] = None
    currency: Optional[str] = None
    end_time: Optional[int] = None
    object: Optional[str] = None
    results: Optional[List[str]] = None
    start_time: Optional[int] = None
