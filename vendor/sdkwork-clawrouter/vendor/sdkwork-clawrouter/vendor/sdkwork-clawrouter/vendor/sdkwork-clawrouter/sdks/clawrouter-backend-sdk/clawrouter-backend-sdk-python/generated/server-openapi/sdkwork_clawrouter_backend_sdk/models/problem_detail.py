from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .field_error import FieldError


@dataclass
class ProblemDetail:
    """RFC 9457 problem details error response."""
    status: int
    title: str
    type: str
    code: Optional[str] = None
    detail: Optional[str] = None
    errors: Optional[List[FieldError]] = None
    instance: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
