from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleFileData:
    """Google Gemini google file data schema exposed by Claw Router vendor routing."""
    file_uri: Optional[str] = None
    mime_type: Optional[str] = None
