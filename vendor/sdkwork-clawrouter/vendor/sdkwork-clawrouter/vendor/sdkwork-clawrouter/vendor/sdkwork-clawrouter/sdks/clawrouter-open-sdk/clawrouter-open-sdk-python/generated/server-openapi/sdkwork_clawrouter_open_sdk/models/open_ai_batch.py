from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_batch_request_counts import OpenAiBatchRequestCounts


@dataclass
class OpenAiBatch:
    """OpenAI-compatible batch object."""
    completion_window: str
    endpoint: str
    id: str
    input_file_id: str
    object: str
    status: str
    cancelled_at: Optional[int] = None
    cancelling_at: Optional[int] = None
    completed_at: Optional[int] = None
    created_at: Optional[int] = None
    error_file_id: Optional[str] = None
    errors: Optional[str] = None
    expired_at: Optional[int] = None
    expires_at: Optional[int] = None
    failed_at: Optional[int] = None
    finalizing_at: Optional[int] = None
    in_progress_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    output_file_id: Optional[str] = None
    request_counts: Optional[OpenAiBatchRequestCounts] = None
