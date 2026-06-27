from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .no_data import NoData


@dataclass
class ModelsListResult:
    """Models list result schema exposed by Claw Router."""
    code: str
    data: Optional[NoData] = None
    msg: Optional[str] = None
