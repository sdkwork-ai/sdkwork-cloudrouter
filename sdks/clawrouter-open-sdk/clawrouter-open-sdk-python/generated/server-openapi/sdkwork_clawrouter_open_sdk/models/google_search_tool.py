from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_dynamic_retrieval_config import GoogleDynamicRetrievalConfig


@dataclass
class GoogleSearchTool:
    """Google Search grounding tool configuration."""
    dynamic_retrieval_config: Optional[GoogleDynamicRetrievalConfig] = None
