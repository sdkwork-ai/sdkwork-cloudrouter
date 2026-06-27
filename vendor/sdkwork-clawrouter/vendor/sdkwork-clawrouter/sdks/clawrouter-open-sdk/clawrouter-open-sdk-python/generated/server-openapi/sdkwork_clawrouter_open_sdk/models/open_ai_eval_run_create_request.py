from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiEvalRunCreateRequest:
    """OpenAI-compatible request to create an eval run."""
    data_source: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
