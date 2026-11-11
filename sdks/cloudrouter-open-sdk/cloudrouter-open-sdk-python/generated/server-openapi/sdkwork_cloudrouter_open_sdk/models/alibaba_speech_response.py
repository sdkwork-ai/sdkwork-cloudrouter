from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AlibabaSpeechResponse:
    """Alibaba DashScope speech synthesis response carrying the generated audio URL."""
    code: Optional[str] = None
    message: Optional[str] = None
    output: Optional[Dict[str, str]] = None
    request_id: Optional[str] = None
    usage: Optional[Dict[str, str]] = None
