from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningGraderRunResult:
    """OpenAI-compatible fine-tuning grader run result."""
    details: Optional[str] = None
    feedback: Optional[str] = None
    passed: Optional[bool] = None
    score: Optional[float] = None
