from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_file import AnthropicFile


@dataclass
class AnthropicFileListResponse:
    """Anthropic Claude anthropic file list response schema exposed by Claw Router vendor routing."""
    data: List[AnthropicFile]
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
