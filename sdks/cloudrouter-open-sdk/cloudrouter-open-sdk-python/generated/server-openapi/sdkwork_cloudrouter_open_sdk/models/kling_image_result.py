from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingImageResult:
    """One generated Kling image."""
    index: Optional[int] = None
    url: Optional[str] = None
