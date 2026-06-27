from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiAnnotation:
    """OpenAI-compatible open ai annotation schema exposed by Claw Router."""
    type: str
    end_index: Optional[int] = None
    file_id: Optional[str] = None
    filename: Optional[str] = None
    index: Optional[int] = None
    start_index: Optional[int] = None
    title: Optional[str] = None
    url: Optional[str] = None
