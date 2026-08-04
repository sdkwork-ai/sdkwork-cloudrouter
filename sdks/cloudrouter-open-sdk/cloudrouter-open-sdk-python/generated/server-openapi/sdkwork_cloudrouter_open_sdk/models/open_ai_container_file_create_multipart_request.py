from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiContainerFileCreateMultipartRequest:
    """OpenAI-compatible multipart request to upload or create a container file."""
    file: str
    metadata: Optional[str] = None
    purpose: Optional[str] = None
