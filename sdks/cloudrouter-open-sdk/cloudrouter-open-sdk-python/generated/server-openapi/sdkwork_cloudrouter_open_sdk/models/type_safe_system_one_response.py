from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .type_safe_answer import TypeSafeAnswer
    from .type_safe_usage import TypeSafeUsage


@dataclass
class TypeSafeSystemOneResponse:
    """Type safe system one response schema exposed by Cloud Router."""
    answers: Dict[str, TypeSafeAnswer]
    model: Optional[str] = None
    usage: Optional[TypeSafeUsage] = None
