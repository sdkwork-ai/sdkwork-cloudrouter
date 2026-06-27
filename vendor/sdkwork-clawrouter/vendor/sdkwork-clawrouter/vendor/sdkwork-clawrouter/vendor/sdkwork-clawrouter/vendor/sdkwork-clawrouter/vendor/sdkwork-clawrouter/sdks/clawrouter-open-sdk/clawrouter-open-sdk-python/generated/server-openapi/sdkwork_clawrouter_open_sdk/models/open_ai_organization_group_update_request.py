from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationGroupUpdateRequest:
    """OpenAI-compatible request to update an organization group."""
    description: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
