from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_file import OpenAiFile


@dataclass
class OpenAiUpload:
    """OpenAI-compatible upload object."""
    bytes: int
    created_at: int
    filename: str
    id: str
    object: str
    purpose: str
    status: str
    expires_at: Optional[int] = None
    file: Optional[OpenAiFile] = None
