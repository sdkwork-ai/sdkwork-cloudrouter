from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiImageGenerationRequest:
    """OpenAI-compatible open ai image generation request schema exposed by Claw Router."""
    model: str
    prompt: str
    quality: Optional[str] = None
    response_format: Optional[str] = None
    size: Optional[str] = None
