from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRunUpdateRequest:
    """OpenAI-compatible request to update a thread run."""
    metadata: Optional[Dict[str, str]] = None
