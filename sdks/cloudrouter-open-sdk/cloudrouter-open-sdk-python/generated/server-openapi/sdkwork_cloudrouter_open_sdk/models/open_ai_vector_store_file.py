from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreFile:
    """OpenAI-compatible vector store file object."""
    created_at: int
    id: str
    object: str
    status: str
    vector_store_id: str
    attributes: Optional[Dict[str, str]] = None
    chunking_strategy: Optional[str] = None
    last_error: Optional[str] = None
    usage_bytes: Optional[int] = None
