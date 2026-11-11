from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class LumaGenerationAssets:
    """Luma generation assets."""
    image: Optional[str] = None
    video: Optional[str] = None
