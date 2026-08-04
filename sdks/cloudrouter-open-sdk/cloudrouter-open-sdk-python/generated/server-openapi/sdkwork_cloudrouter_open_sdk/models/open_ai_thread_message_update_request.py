from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiThreadMessageUpdateRequest:
    """OpenAI-compatible request to update a thread message."""
    metadata: Optional[Dict[str, str]] = None
