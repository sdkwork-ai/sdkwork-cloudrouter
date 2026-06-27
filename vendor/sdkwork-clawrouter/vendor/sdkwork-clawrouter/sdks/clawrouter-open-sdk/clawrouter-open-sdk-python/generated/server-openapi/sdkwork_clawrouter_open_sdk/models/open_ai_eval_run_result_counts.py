from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiEvalRunResultCounts:
    """Counts of eval run output item results."""
    errored: Optional[int] = None
    failed: Optional[int] = None
    passed: Optional[int] = None
    total: Optional[int] = None
