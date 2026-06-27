from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiProjectUpdateRequest:
    """OpenAI-compatible request to update a project."""
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
