from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiUploadCompleteRequest:
    """OpenAI-compatible request to complete an upload."""
    part_ids: List[str]
    md5: Optional[str] = None
