from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiProjectUserCreateRequest:
    """OpenAI-compatible request to add a user to a project."""
    role: str
    user_id: str
