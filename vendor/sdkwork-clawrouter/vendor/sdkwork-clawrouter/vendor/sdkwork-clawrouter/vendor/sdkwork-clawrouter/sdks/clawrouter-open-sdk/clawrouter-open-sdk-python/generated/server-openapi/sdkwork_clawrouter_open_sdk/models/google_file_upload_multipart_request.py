from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleFileUploadMultipartRequest:
    """Google Gemini google file upload multipart request schema exposed by Claw Router vendor routing."""
    file: str
    metadata: Optional[str] = None
