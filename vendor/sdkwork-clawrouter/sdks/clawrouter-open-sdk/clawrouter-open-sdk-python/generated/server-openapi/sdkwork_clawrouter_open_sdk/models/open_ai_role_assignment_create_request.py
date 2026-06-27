from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRoleAssignmentCreateRequest:
    """OpenAI-compatible request to create a role assignment."""
    role_id: str
