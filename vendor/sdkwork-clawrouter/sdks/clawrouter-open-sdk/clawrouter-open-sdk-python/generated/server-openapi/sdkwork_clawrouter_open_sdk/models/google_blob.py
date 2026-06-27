from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleBlob:
    """Google Gemini google blob schema exposed by Claw Router vendor routing."""
    data: Optional[str] = None
    mime_type: Optional[str] = None
