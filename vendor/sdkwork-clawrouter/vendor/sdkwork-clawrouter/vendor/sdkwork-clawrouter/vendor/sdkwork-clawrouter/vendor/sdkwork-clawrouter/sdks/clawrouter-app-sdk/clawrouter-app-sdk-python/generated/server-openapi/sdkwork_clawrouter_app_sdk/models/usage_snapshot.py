from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UsageSnapshot:
    """Usage snapshot schema exposed by Claw Router."""
    cached_tokens: Optional[str] = None
    input_tokens: Optional[str] = None
    output_tokens: Optional[str] = None
    total_tokens: Optional[str] = None
