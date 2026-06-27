from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreSearchResult:
    """Single vector store search result."""
    attributes: Optional[Dict[str, str]] = None
    content: Optional[List[str]] = None
    file_id: Optional[str] = None
    filename: Optional[str] = None
    score: Optional[float] = None
