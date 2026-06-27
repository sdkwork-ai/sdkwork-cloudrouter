from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleFunctionCallingConfig:
    """Google Gemini google function calling config schema exposed by Claw Router vendor routing."""
    allowed_function_names: Optional[List[str]] = None
    mode: Optional[str] = None
