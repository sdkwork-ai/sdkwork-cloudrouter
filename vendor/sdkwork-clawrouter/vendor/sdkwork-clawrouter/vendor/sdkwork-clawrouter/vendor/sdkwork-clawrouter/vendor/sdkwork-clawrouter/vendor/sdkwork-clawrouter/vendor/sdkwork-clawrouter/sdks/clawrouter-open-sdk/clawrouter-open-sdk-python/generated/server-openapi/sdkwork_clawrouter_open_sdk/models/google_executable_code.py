from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleExecutableCode:
    """Google Gemini google executable code schema exposed by Claw Router vendor routing."""
    code: Optional[str] = None
    language: Optional[str] = None
