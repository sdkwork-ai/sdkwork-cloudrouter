from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleThinkingConfig:
    """Google Gemini google thinking config schema exposed by Claw Router vendor routing."""
    include_thoughts: Optional[bool] = None
    thinking_budget: Optional[int] = None
