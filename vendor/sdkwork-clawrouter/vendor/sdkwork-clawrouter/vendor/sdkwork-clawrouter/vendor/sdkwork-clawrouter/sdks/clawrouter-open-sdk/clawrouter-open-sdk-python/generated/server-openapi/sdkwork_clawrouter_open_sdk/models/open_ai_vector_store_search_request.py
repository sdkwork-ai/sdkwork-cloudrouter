from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreSearchRequest:
    """OpenAI-compatible request to search a vector store."""
    query: str
    filters: Optional[str] = None
    max_num_results: Optional[int] = None
    ranking_options: Optional[str] = None
    rewrite_query: Optional[bool] = None
