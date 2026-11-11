from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GeminiVideoOperation:
    """Gemini video operation schema exposed by Cloud Router."""
    done: Optional[bool] = None
    error: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    response: Optional[Dict[str, str]] = None
