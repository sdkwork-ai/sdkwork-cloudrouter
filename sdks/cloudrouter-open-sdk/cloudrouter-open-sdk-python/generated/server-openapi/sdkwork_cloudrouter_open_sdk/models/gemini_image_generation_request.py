from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GeminiImageGenerationRequest:
    """Gemini image generation request schema exposed by Cloud Router."""
    instances: List[Dict[str, str]]
    parameters: Optional[Dict[str, str]] = None
