from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleContentEmbedding:
    """Google Gemini google content embedding schema exposed by Claw Router vendor routing."""
    values: Optional[List[float]] = None
