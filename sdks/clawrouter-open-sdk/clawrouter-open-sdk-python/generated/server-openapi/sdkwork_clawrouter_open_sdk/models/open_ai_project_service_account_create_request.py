from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiProjectServiceAccountCreateRequest:
    """OpenAI-compatible request to create a project service account."""
    name: str
    role: Optional[str] = None
