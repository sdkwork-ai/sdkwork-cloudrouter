from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiJsonSchema:
    """OpenAI-compatible open ai json schema schema exposed by Claw Router."""
    additional_properties: Optional[bool] = None
    description: Optional[str] = None
    enum: Optional[List[str]] = None
    items: Any = None
    properties: Optional[Dict[str, Any]] = None
    required: Optional[List[str]] = None
    type: Optional[str] = None
