from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiEmbeddingUsage:
    """OpenAI-compatible open ai embedding usage schema exposed by Claw Router."""
    prompt_tokens: int
    total_tokens: int
