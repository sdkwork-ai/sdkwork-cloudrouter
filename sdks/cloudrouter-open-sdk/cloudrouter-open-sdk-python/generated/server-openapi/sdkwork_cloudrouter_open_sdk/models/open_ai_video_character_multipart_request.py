from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideoCharacterMultipartRequest:
    """OpenAI-compatible multipart request to create a reusable video character."""
    description: Optional[str] = None
    file: Optional[bytes] = None
    image: Optional[bytes] = None
    metadata: Optional[str] = None
    name: Optional[str] = None
