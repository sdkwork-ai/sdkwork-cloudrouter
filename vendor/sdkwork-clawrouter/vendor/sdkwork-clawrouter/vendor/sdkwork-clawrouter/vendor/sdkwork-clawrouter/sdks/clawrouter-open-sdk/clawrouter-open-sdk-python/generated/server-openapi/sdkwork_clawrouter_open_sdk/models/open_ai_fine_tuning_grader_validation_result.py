from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningGraderValidationResult:
    """OpenAI-compatible fine-tuning grader validation result."""
    errors: Optional[List[str]] = None
    valid: Optional[bool] = None
    warnings: Optional[List[str]] = None
