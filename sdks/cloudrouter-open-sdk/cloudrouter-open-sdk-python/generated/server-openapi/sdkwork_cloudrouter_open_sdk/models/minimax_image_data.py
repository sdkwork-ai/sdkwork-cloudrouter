from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MinimaxImageData:
    """MiniMax generated-image envelope."""
    image_base64: Optional[List[str]] = None
    image_urls: Optional[List[str]] = None
