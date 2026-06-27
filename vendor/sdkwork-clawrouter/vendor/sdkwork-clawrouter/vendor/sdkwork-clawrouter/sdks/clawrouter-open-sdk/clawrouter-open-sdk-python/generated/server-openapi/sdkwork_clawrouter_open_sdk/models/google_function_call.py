from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleFunctionCall:
    """Google Gemini google function call schema exposed by Claw Router vendor routing."""
    args: Optional[Dict[str, Any]] = None
    name: Optional[str] = None
