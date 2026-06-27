from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiEmbeddingsRequest:
    """OpenAI-compatible open ai embeddings request schema exposed by Claw Router."""
    input: str
    model: str
    dimensions: Optional[int] = None
    encoding_format: Optional[str] = None
    user: Optional[str] = None
