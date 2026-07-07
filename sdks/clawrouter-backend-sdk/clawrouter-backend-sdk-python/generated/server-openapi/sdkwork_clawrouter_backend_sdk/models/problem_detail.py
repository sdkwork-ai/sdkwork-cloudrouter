from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .field_error import FieldError


@dataclass
class ProblemDetail:
    code: int
    status: int
    title: str
    trace_id: str
    type: str
    detail: Optional[str] = None
    errors: Optional[List[FieldError]] = None
    instance: Optional[str] = None
