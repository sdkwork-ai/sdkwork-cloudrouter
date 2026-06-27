from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_content import GoogleContent


@dataclass
class GoogleEmbedContentRequest:
    """Google Gemini google embed content request schema exposed by Claw Router vendor routing."""
    content: GoogleContent
    output_dimensionality: Optional[int] = None
    task_type: Optional[str] = None
    title: Optional[str] = None
