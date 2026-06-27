from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiThreadUpdateRequest:
    """OpenAI-compatible request to update a thread."""
    metadata: Optional[Dict[str, str]] = None
    tool_resources: Optional[str] = None
