from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_embed_content_request import GoogleEmbedContentRequest


@dataclass
class GoogleBatchEmbedContentsRequest:
    """Google Gemini google batch embed contents request schema exposed by Claw Router vendor routing."""
    requests: List[GoogleEmbedContentRequest]
