from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiEvalRunOutputItem:
    """OpenAI-compatible eval run output item."""
    id: str
    object: str
    created_at: Optional[int] = None
    eval_id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    results: Optional[List[str]] = None
    run_id: Optional[str] = None
    sample: Optional[str] = None
    status: Optional[str] = None
