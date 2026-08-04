from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideoCharacterCreateRequest:
    """OpenAI-compatible request to create a reusable video character."""
    description: Optional[str] = None
    image: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
