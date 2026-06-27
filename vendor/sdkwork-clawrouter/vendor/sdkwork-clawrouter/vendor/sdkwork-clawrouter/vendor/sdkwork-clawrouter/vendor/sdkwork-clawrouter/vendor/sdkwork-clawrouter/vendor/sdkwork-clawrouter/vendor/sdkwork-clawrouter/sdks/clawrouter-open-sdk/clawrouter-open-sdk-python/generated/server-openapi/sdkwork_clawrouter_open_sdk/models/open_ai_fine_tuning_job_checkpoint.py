from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningJobCheckpoint:
    """OpenAI-compatible fine-tuning job checkpoint object."""
    created_at: int
    id: str
    object: str
    fine_tuned_model_checkpoint: Optional[str] = None
    fine_tuning_job_id: Optional[str] = None
    metrics: Optional[str] = None
    step_number: Optional[int] = None
