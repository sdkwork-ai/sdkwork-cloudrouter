from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GeminiImageGenerationResponse:
    """Gemini image generation response schema exposed by Cloud Router."""
    error: Optional[Dict[str, str]] = None
    predictions: Optional[List[Dict[str, str]]] = None
