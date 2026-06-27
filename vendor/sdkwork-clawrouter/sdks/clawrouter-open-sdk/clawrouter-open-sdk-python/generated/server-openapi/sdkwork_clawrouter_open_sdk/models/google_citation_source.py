from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleCitationSource:
    """Single citation source returned by Gemini."""
    end_index: Optional[int] = None
    license: Optional[str] = None
    start_index: Optional[int] = None
    uri: Optional[str] = None
