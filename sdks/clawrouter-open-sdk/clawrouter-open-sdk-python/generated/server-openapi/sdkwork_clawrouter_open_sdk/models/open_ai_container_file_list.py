from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_container_file import OpenAiContainerFile


@dataclass
class OpenAiContainerFileList:
    """OpenAI-compatible paginated list of container files."""
    data: List[OpenAiContainerFile]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
