from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_content import GoogleContent
    from .google_generate_content_request import GoogleGenerateContentRequest


@dataclass
class GoogleCountTokensRequest:
    """Google Gemini google count tokens request schema exposed by Claw Router vendor routing."""
    contents: Optional[List[GoogleContent]] = None
    generate_content_request: Optional[GoogleGenerateContentRequest] = None
