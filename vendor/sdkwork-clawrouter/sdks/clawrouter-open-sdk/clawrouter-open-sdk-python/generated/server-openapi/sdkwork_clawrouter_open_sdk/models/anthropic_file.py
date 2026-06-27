from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicFile:
    """Anthropic Claude anthropic file schema exposed by Claw Router vendor routing."""
    created_at: str
    filename: str
    id: str
    mime_type: str
    size_bytes: int
    type: str
    downloadable: Optional[bool] = None
