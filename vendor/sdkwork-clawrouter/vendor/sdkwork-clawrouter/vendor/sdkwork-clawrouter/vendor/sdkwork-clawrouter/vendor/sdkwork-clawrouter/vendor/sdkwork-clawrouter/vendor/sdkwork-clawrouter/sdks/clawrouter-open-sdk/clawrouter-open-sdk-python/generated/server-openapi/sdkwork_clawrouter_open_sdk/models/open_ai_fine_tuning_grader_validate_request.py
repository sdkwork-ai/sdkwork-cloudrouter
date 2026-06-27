from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningGraderValidateRequest:
    """OpenAI-compatible request to validate a fine-tuning grader definition."""
    grader: str
