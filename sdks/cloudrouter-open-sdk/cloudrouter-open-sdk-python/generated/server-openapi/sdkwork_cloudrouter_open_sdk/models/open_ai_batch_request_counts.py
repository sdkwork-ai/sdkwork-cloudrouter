from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiBatchRequestCounts:
    """Batch request processing counters."""
    completed: Optional[int] = None
    failed: Optional[int] = None
    total: Optional[int] = None
