from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationGroupUserCreateRequest:
    """OpenAI-compatible request to add a user to an organization group."""
    user_id: str
