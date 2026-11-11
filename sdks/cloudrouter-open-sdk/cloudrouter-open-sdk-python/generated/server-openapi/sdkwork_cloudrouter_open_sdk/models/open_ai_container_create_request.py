from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiContainerCreateRequest:
    """OpenAI-compatible request to create a container."""
    expires_after: Optional[Dict[str, str]] = None
    file_ids: Optional[List[str]] = None
    memory_limit: Optional[str] = None
    name: Optional[str] = None
    network_policy: Optional[Dict[str, str]] = None
    skills: Optional[List[Dict[str, str]]] = None
