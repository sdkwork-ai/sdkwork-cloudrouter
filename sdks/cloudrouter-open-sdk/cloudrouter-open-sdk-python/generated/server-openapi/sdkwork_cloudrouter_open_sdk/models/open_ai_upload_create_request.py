from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiUploadCreateRequest:
    """OpenAI-compatible request to create an upload."""
    bytes: int
    filename: str
    mime_type: str
    purpose: str
