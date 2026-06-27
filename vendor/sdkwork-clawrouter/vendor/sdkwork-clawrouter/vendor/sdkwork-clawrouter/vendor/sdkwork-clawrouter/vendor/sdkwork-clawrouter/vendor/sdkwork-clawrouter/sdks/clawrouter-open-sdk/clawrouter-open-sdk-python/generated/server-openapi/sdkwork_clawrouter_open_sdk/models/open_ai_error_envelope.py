from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_error import OpenAiError


@dataclass
class OpenAiErrorEnvelope:
    """OpenAI-compatible open ai error envelope schema exposed by Claw Router."""
    error: OpenAiError
