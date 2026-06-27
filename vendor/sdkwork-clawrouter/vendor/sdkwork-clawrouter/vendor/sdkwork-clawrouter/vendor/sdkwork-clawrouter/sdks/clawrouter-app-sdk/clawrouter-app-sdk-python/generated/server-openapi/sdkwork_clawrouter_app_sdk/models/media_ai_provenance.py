from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MediaAiProvenance:
    """Media ai provenance schema exposed by Claw Router."""
    generation_task_id: Optional[str] = None
    model: Optional[str] = None
    moderation_status: Optional[str] = None
    prompt_id: Optional[str] = None
    provenance: Optional[str] = None
    provider: Optional[str] = None
    safety_labels: Optional[List[str]] = None
    seed: Optional[str] = None
    source_media_ids: Optional[List[str]] = None
