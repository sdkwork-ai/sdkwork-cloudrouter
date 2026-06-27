from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningJobCreateRequest:
    """OpenAI-compatible request to create a fine-tuning job."""
    model: str
    training_file: str
    hyperparameters: Optional[str] = None
    integrations: Optional[List[str]] = None
    metadata: Optional[Dict[str, str]] = None
    seed: Optional[int] = None
    suffix: Optional[str] = None
    validation_file: Optional[str] = None
