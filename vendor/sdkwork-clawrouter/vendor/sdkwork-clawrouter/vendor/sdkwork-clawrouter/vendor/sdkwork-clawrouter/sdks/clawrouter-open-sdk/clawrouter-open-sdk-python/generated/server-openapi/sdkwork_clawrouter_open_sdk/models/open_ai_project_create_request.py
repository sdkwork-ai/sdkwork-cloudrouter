from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiProjectCreateRequest:
    """OpenAI-compatible request to create a project."""
    name: str
    metadata: Optional[Dict[str, str]] = None
