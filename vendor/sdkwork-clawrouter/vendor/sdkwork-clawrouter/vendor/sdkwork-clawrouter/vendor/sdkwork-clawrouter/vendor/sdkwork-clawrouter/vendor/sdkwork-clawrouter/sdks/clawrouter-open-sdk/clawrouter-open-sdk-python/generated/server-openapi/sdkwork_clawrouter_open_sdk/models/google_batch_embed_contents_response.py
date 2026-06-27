from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_content_embedding import GoogleContentEmbedding


@dataclass
class GoogleBatchEmbedContentsResponse:
    """Google Gemini google batch embed contents response schema exposed by Claw Router vendor routing."""
    embeddings: Optional[List[GoogleContentEmbedding]] = None
