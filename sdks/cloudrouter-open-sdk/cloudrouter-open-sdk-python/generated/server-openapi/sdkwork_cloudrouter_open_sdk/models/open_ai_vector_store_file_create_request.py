from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreFileCreateRequest:
    """OpenAI-compatible request to attach a file to a vector store."""
    file_id: str
    attributes: Optional[Dict[str, str]] = None
    chunking_strategy: Optional[str] = None
