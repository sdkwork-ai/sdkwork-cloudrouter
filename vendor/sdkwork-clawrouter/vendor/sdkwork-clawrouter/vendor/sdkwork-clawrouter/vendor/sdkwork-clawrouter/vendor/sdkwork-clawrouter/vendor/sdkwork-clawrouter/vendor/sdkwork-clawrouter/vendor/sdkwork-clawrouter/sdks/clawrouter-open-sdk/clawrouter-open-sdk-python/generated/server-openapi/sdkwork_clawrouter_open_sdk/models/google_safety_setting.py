from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleSafetySetting:
    """Google Gemini google safety setting schema exposed by Claw Router vendor routing."""
    category: Optional[str] = None
    threshold: Optional[str] = None
