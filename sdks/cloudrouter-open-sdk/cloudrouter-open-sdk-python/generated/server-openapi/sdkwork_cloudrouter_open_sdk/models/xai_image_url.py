from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class XaiImageUrl:
    """An xAI image input: a public URL, a base64 data URL, or an xAI Files API id."""
    file_id: Optional[str] = None
    url: Optional[str] = None
