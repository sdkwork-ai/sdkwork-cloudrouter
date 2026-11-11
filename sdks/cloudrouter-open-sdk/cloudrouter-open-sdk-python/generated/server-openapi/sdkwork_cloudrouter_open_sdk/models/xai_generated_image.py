from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class XaiGeneratedImage:
    """One generated image, as a URL, a base64 payload, or a Files API output reference."""
    b64_json: Optional[str] = None
    file_output: Optional[Dict[str, str]] = None
    mime_type: Optional[str] = None
    storage_error: Optional[str] = None
    url: Optional[str] = None
