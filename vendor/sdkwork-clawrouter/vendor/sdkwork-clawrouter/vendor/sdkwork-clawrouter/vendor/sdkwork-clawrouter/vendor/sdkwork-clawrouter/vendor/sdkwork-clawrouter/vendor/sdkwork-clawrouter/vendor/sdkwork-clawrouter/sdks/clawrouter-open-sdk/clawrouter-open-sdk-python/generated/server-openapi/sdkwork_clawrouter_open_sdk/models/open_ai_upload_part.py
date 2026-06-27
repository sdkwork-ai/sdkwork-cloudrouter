from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiUploadPart:
    """OpenAI-compatible upload part object."""
    created_at: int
    id: str
    object: str
    upload_id: str
