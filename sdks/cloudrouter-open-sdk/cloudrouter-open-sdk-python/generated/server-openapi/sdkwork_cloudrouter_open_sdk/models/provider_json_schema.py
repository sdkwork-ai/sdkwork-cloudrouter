from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ProviderJsonSchema:
    """Reusable JSON Schema object used by provider tool definitions."""
    additional_properties: Optional[bool] = None
    description: Optional[str] = None
    enum: Optional[List[str]] = None
    items: Any = None
    properties: Optional[Dict[str, Any]] = None
    required: Optional[List[str]] = None
    type: Optional[str] = None
