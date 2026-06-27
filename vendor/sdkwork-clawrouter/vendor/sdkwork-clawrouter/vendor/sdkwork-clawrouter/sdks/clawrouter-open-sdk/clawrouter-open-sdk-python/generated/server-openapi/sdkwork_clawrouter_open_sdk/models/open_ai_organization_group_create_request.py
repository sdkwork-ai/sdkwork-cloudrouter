from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationGroupCreateRequest:
    """OpenAI-compatible request to create an organization group."""
    name: str
    description: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
