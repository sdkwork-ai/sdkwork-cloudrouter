from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiProjectUserUpdateRequest:
    """OpenAI-compatible request to update a project user."""
    role: Optional[str] = None
