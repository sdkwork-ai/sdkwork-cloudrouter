from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .volcengine_content_part import VolcengineContentPart


@dataclass
class VolcengineContentGenerationTaskCreateRequest:
    """Volcengine Ark volcengine content generation task create request schema exposed by Claw Router vendor routing."""
    content: List[VolcengineContentPart]
    model: str
    callback_url: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
