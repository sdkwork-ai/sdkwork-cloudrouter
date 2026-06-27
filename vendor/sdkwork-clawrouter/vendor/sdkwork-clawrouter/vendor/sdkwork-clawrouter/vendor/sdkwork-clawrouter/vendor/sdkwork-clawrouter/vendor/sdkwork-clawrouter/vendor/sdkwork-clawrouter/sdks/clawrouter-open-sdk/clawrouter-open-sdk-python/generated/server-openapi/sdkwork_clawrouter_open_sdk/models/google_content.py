from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_part import GooglePart


@dataclass
class GoogleContent:
    """Google Gemini google content schema exposed by Claw Router vendor routing."""
    parts: Optional[List[GooglePart]] = None
    role: Optional[str] = None
