from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class VolcengineContentGenerationTaskCreateResponse:
    """Volcengine Ark video generation task creation response."""
    id: Optional[str] = None
