from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class FieldError:
    """Field-level validation problem detail."""
    code: Optional[str] = None
    field: Optional[str] = None
    message: Optional[str] = None
