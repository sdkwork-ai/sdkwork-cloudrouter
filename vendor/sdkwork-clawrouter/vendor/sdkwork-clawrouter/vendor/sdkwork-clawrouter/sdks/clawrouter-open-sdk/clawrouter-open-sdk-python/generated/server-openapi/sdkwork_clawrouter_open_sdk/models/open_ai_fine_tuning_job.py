from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningJob:
    """OpenAI-compatible fine-tuning job object."""
    created_at: int
    id: str
    model: str
    object: str
    status: str
    error: Optional[str] = None
    fine_tuned_model: Optional[str] = None
    finished_at: Optional[int] = None
    hyperparameters: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    organization_id: Optional[str] = None
    result_files: Optional[List[str]] = None
    trained_tokens: Optional[int] = None
    training_file: Optional[str] = None
    validation_file: Optional[str] = None
