from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_vector_store_search_result import OpenAiVectorStoreSearchResult


@dataclass
class OpenAiVectorStoreSearchResponse:
    """OpenAI-compatible vector store search response."""
    data: Optional[List[OpenAiVectorStoreSearchResult]] = None
    object: Optional[str] = None
    search_query: Optional[List[str]] = None
