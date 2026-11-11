from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class TypeSafeUsage:
    """Type safe usage schema exposed by Cloud Router."""
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
