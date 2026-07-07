from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .no_data import NoData


@dataclass
class InstallationStatusRetrieveResult:
    """Installation status retrieve result schema exposed by Claw Router."""
    code: int
    data: Any
    trace_id: str
