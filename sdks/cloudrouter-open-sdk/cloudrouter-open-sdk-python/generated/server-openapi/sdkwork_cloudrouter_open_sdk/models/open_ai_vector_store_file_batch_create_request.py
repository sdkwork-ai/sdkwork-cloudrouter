from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreFileBatchCreateRequest:
    """OpenAI-compatible request to attach multiple files to a vector store."""
    attributes: Optional[Dict[str, str]] = None
    chunking_strategy: Optional[str] = None
    file_ids: Optional[List[str]] = None
    files: Optional[List[Dict[str, str]]] = None
