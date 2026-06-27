from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_vector_store_file_counts import OpenAiVectorStoreFileCounts


@dataclass
class OpenAiVectorStoreFileBatch:
    """OpenAI-compatible vector store file batch object."""
    created_at: int
    id: str
    object: str
    status: str
    vector_store_id: str
    file_counts: Optional[OpenAiVectorStoreFileCounts] = None
