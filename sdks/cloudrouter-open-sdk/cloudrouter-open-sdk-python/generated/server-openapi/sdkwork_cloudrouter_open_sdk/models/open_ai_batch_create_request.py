from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiBatchCreateRequest:
    """OpenAI-compatible request to create a batch."""
    completion_window: str
    endpoint: str
    input_file_id: str
    metadata: Optional[Dict[str, str]] = None
