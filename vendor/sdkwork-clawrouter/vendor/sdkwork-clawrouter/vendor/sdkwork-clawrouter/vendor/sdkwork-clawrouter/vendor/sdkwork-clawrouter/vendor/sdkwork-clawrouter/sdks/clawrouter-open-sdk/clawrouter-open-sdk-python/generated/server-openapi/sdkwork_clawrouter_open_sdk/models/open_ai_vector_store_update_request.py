from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreUpdateRequest:
    """OpenAI-compatible request to update a vector store."""
    expires_after: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
