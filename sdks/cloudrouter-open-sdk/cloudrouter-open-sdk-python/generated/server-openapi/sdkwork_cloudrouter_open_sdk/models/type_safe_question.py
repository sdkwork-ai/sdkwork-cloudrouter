from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class TypeSafeQuestion:
    """Type safe question schema exposed by Cloud Router."""
    instructions: str
    type: str
    criteria: Optional[str] = None
