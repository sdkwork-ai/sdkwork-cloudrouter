from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreCreateRequest:
    """OpenAI-compatible request to create a vector store."""
    chunking_strategy: Optional[str] = None
    expires_after: Optional[str] = None
    file_ids: Optional[List[str]] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
