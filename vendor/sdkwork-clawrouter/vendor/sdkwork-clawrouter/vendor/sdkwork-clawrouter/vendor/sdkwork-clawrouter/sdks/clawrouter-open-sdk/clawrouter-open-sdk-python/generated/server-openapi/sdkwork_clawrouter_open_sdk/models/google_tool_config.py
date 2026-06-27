from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_function_calling_config import GoogleFunctionCallingConfig


@dataclass
class GoogleToolConfig:
    """Google Gemini google tool config schema exposed by Claw Router vendor routing."""
    function_calling_config: Optional[GoogleFunctionCallingConfig] = None
