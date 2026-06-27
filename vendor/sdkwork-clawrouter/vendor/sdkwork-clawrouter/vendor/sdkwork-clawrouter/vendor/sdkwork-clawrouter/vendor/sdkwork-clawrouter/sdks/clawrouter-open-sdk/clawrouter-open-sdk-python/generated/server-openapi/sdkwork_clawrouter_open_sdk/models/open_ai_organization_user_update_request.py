from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationUserUpdateRequest:
    """OpenAI-compatible request to update an organization user."""
    metadata: Optional[Dict[str, str]] = None
    role: Optional[str] = None
