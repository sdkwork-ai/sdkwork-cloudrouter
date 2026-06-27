from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFileReferenceObject:
    """Structured file reference used when a JSON endpoint accepts uploaded, hosted, or inline file input."""
    file_data: Optional[str] = None
    file_id: Optional[str] = None
    filename: Optional[str] = None
    mime_type: Optional[str] = None
    url: Optional[str] = None
