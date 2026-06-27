from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_eval_run_result_counts import OpenAiEvalRunResultCounts


@dataclass
class OpenAiEvalRun:
    """OpenAI-compatible eval run object."""
    created_at: int
    id: str
    object: str
    status: str
    data_source: Optional[str] = None
    eval_id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    report_url: Optional[str] = None
    result_counts: Optional[OpenAiEvalRunResultCounts] = None
