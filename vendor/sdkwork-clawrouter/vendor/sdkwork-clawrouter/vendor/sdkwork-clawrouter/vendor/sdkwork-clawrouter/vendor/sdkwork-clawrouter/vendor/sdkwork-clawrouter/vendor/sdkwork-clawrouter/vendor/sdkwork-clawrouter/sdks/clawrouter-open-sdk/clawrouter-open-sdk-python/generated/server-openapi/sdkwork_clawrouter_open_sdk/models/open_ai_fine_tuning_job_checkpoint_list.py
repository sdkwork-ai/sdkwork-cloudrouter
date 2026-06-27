from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_fine_tuning_job_checkpoint import OpenAiFineTuningJobCheckpoint


@dataclass
class OpenAiFineTuningJobCheckpointList:
    """OpenAI-compatible paginated list of fine-tuning job checkpoints."""
    data: List[OpenAiFineTuningJobCheckpoint]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
