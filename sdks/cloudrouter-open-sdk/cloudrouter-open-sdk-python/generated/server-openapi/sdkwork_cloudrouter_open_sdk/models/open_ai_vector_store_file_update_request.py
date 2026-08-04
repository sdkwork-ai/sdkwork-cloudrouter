from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreFileUpdateRequest:
    """OpenAI-compatible request to update vector store file attributes."""
    attributes: Optional[Dict[str, str]] = None
