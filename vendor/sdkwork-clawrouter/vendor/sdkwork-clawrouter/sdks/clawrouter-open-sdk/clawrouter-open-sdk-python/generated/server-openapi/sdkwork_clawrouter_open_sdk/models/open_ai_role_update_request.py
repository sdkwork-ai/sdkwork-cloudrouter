from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRoleUpdateRequest:
    """OpenAI-compatible request to update a role."""
    description: Optional[str] = None
    name: Optional[str] = None
    permissions: Optional[List[str]] = None
