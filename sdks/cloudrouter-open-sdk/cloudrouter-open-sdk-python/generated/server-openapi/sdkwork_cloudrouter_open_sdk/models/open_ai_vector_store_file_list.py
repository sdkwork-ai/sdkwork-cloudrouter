from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_vector_store_file import OpenAiVectorStoreFile


@dataclass
class OpenAiVectorStoreFileList:
    """OpenAI-compatible paginated list of vector store files."""
    data: List[OpenAiVectorStoreFile]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
