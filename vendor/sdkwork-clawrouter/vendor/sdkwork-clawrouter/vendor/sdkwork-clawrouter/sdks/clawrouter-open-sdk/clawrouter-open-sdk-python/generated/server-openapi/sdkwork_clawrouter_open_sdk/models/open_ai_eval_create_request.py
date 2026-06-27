from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiEvalCreateRequest:
    """OpenAI-compatible request to create an eval."""
    data_source_config: str
    name: str
    testing_criteria: List[str]
    data_source: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
