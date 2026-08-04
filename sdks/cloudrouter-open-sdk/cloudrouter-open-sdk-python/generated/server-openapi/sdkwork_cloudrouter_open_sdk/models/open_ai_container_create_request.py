from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiContainerCreateRequest:
    """OpenAI-compatible request to create a container."""
    file_ids: Optional[List[str]] = None
    memory_limit: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
