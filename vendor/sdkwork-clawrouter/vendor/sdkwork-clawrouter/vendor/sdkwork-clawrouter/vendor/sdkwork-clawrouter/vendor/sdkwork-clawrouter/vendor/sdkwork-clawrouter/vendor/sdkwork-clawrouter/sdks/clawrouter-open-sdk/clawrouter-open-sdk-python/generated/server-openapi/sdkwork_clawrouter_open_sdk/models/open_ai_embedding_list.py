from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_embedding import OpenAiEmbedding
    from .open_ai_embedding_usage import OpenAiEmbeddingUsage


@dataclass
class OpenAiEmbeddingList:
    """OpenAI-compatible open ai embedding list schema exposed by Claw Router."""
    data: List[OpenAiEmbedding]
    object: str
    usage: OpenAiEmbeddingUsage
    model: Optional[str] = None
