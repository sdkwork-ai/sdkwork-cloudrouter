from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiModerationCreateRequest:
    """OpenAI-compatible request to classify text or multimodal input for moderation."""
    input: str
    model: str
