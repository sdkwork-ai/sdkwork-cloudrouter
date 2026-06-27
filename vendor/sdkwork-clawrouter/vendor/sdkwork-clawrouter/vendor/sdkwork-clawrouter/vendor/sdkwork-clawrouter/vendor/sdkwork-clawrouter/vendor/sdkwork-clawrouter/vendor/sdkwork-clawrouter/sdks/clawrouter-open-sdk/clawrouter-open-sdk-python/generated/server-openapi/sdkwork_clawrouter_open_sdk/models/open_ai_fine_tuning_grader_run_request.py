from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningGraderRunRequest:
    """OpenAI-compatible request to run a fine-tuning grader against sample input."""
    grader: str
    input: str
    model_sample: Optional[str] = None
    reference_answer: Optional[str] = None
