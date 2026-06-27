from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiEvalUpdateRequest:
    """OpenAI-compatible request to update an eval."""
    data_source: Optional[str] = None
    data_source_config: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    testing_criteria: Optional[List[str]] = None
