from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_file import OpenAiFile


@dataclass
class OpenAiFileList:
    """OpenAI-compatible paginated list of files."""
    data: List[OpenAiFile]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
