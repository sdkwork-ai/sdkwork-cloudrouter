from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ProviderRetryPolicy:
    """Provider retry policy schema exposed by Claw Router."""
    max_attempts: int
    retryable_status_codes: List[int]
    backoff_ms: Optional[int] = None
