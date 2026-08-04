from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreFileBatchCreateRequest:
    """OpenAI-compatible request to attach multiple files to a vector store."""
    file_ids: List[str]
    attributes: Optional[Dict[str, str]] = None
    chunking_strategy: Optional[str] = None
