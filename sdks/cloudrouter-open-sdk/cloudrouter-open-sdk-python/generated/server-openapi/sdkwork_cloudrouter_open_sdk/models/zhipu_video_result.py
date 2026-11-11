from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ZhipuVideoResult:
    """One generated Zhipu video."""
    cover_image_url: Optional[str] = None
    url: Optional[str] = None
