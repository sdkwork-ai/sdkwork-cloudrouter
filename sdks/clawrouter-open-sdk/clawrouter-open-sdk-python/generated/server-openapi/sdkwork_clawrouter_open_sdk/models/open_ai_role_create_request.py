from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRoleCreateRequest:
    """OpenAI-compatible request to create a role."""
    name: str
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
