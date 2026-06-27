from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_file import GoogleFile


@dataclass
class GoogleFileListResponse:
    """Google Gemini google file list response schema exposed by Claw Router vendor routing."""
    files: Optional[List[GoogleFile]] = None
    next_page_token: Optional[str] = None
