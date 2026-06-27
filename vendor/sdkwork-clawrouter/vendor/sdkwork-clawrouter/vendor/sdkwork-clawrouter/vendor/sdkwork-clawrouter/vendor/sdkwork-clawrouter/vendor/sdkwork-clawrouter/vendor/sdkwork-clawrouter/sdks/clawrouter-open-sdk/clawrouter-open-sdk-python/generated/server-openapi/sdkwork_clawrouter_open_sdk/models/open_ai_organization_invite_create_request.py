from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationInviteCreateRequest:
    """OpenAI-compatible request to create an organization invite."""
    email: str
    role: str
    projects: Optional[List[str]] = None
