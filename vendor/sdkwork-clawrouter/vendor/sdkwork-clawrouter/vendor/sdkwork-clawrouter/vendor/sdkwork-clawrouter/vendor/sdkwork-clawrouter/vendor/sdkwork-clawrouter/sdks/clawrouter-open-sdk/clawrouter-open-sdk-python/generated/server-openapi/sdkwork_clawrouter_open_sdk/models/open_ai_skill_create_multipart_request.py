from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiSkillCreateMultipartRequest:
    """OpenAI-compatible multipart request to create a skill."""
    file: str
    metadata: Optional[str] = None
    name: Optional[str] = None
    package: Optional[str] = None
