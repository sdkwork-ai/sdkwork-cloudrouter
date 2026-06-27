from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiReasoningConfig:
    """OpenAI-compatible open ai reasoning config schema exposed by Claw Router."""
    effort: Optional[str] = None
    summary: Optional[str] = None
