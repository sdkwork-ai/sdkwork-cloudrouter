from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class PixverseErrorDetail:
    """PixVerse supplemental error detail."""
    message: Optional[str] = None
    param: Optional[Dict[str, str]] = None
    type: Optional[str] = None
