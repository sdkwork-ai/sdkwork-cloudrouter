from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicMessageBatchRequestCounts:
    """Anthropic Claude anthropic message batch request counts schema exposed by Claw Router vendor routing."""
    canceled: Optional[int] = None
    errored: Optional[int] = None
    expired: Optional[int] = None
    processing: Optional[int] = None
    succeeded: Optional[int] = None
