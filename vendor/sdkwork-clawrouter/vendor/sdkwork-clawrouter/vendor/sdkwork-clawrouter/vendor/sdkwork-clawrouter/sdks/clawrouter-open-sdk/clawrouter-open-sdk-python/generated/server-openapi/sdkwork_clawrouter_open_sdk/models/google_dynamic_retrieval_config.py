from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleDynamicRetrievalConfig:
    """Dynamic retrieval configuration for Google Search grounding."""
    dynamic_threshold: Optional[float] = None
    mode: Optional[str] = None
