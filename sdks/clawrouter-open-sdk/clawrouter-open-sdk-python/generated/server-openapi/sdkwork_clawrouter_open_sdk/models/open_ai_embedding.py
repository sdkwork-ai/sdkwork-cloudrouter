from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiEmbedding:
    """OpenAI-compatible open ai embedding schema exposed by Claw Router."""
    embedding: List[float]
    index: int
    object: str
