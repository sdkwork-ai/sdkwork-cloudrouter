from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_vector_store_file_counts import OpenAiVectorStoreFileCounts


@dataclass
class OpenAiVectorStore:
    """OpenAI-compatible vector store object."""
    created_at: int
    id: str
    object: str
    status: str
    bytes: Optional[int] = None
    expires_after: Optional[str] = None
    expires_at: Optional[int] = None
    file_counts: Optional[OpenAiVectorStoreFileCounts] = None
    last_active_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    usage_bytes: Optional[int] = None
