from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class VolcengineContentGenerationTaskCreateResponse:
    """Volcengine Ark volcengine content generation task create response schema exposed by Claw Router vendor routing."""
    created_at: Optional[str] = None
    id: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[str] = None
