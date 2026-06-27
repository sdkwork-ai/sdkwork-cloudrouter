from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleSafetyRating:
    """Google Gemini google safety rating schema exposed by Claw Router vendor routing."""
    blocked: Optional[bool] = None
    category: Optional[str] = None
    probability: Optional[str] = None
