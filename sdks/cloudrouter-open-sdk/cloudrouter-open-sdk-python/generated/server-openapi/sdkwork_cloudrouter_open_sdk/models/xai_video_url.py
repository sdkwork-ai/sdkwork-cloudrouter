from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class XaiVideoUrl:
    """An xAI video input or output reference. Provide `url` or `file_id` when used as an input."""
    duration: Optional[int] = None
    file_id: Optional[str] = None
    url: Optional[str] = None
