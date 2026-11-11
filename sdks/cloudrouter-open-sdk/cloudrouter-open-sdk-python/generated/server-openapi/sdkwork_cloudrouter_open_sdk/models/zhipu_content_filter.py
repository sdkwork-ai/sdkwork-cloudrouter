from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ZhipuContentFilter:
    """Zhipu content-safety verdict."""
    level: Optional[int] = None
    role: Optional[str] = None
