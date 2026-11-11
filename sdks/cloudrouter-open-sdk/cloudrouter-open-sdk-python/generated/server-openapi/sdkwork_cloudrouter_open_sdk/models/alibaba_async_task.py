from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_generated_media import ProviderGeneratedMedia


@dataclass
class AlibabaAsyncTask:
    """DashScope asynchronous task record shared by task submission and task polling."""
    code: Optional[str] = None
    end_time: Optional[str] = None
    message: Optional[str] = None
    orig_prompt: Optional[str] = None
    results: Optional[List[ProviderGeneratedMedia]] = None
    scheduled_time: Optional[str] = None
    submit_time: Optional[str] = None
    task_id: Optional[str] = None
    task_status: Optional[str] = None
    video_url: Optional[str] = None
