from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .vidu_creation import ViduCreation


@dataclass
class ViduTaskCreationsResponse:
    """Vidu vidu task creations response schema exposed by Claw Router vendor routing."""
    created_at: Optional[str] = None
    creations: Optional[List[ViduCreation]] = None
    model: Optional[str] = None
    state: Optional[str] = None
    task_id: Optional[str] = None
