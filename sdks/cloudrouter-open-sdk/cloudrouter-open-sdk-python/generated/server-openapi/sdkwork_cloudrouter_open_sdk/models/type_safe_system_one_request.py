from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .type_safe_question import TypeSafeQuestion


@dataclass
class TypeSafeSystemOneRequest:
    """Type safe system one request schema exposed by Cloud Router."""
    questions: Dict[str, TypeSafeQuestion]
    state: str
    model: Optional[str] = None
