from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiImageReferenceObject:
    """Structured image reference used when JSON image APIs accept URL, file id, inline, or provider-specific image input."""
    b64_json: Optional[str] = None
    detail: Optional[str] = None
    file_id: Optional[str] = None
    mime_type: Optional[str] = None
    url: Optional[str] = None
