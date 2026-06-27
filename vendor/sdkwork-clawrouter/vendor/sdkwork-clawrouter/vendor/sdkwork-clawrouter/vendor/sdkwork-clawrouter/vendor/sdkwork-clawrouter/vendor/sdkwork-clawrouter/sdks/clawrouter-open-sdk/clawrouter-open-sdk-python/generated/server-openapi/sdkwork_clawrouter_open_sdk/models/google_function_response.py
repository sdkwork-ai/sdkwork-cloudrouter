from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleFunctionResponse:
    """Google Gemini google function response schema exposed by Claw Router vendor routing."""
    name: Optional[str] = None
    response: Optional[Dict[str, Any]] = None
