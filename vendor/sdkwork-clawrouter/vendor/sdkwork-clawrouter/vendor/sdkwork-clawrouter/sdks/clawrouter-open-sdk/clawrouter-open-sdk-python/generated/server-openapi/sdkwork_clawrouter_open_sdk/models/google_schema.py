from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleSchema:
    """Google Gemini google schema schema exposed by Claw Router vendor routing."""
    description: Optional[str] = None
    enum: Optional[List[str]] = None
    format: Optional[str] = None
    items: Any = None
    nullable: Optional[bool] = None
    properties: Optional[Dict[str, Any]] = None
    required: Optional[List[str]] = None
    type: Optional[str] = None
