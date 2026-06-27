from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_content_embedding import GoogleContentEmbedding


@dataclass
class GoogleEmbedContentResponse:
    """Google Gemini google embed content response schema exposed by Claw Router vendor routing."""
    embedding: Optional[GoogleContentEmbedding] = None
