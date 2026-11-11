from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class TypeSafeAnswer:
    """Type safe answer schema exposed by Cloud Router."""
    type: str
    choice: Optional[str] = None
    confidence: Optional[float] = None
    legend: Optional[Dict[str, str]] = None
    noul: Optional[float] = None
    probabilities: Optional[Dict[str, float]] = None
    score: Optional[float] = None
