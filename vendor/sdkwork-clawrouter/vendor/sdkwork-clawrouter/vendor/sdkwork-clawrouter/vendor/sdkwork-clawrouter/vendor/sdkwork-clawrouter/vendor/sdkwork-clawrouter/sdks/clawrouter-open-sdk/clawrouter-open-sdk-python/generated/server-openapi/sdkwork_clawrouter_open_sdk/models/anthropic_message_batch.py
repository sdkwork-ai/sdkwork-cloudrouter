from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_message_batch_request_counts import AnthropicMessageBatchRequestCounts


@dataclass
class AnthropicMessageBatch:
    """Anthropic Claude anthropic message batch schema exposed by Claw Router vendor routing."""
    id: str
    processing_status: str
    request_counts: AnthropicMessageBatchRequestCounts
    type: str
    cancel_initiated_at: Optional[str] = None
    created_at: Optional[str] = None
    ended_at: Optional[str] = None
    expires_at: Optional[str] = None
    results_url: Optional[str] = None
