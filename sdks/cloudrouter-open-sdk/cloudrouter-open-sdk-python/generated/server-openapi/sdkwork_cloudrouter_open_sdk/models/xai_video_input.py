from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class XaiVideoInput:
    """xAI video input for edit and extension requests; provide `url` or `file_id`."""
    file_id: Optional[str] = None
    url: Optional[str] = None
