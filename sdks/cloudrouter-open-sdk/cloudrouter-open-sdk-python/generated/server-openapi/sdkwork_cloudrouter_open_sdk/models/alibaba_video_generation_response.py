from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .alibaba_async_task import AlibabaAsyncTask
    from .alibaba_task_usage import AlibabaTaskUsage


@dataclass
class AlibabaVideoGenerationResponse:
    """Alibaba DashScope asynchronous video task submission acknowledgement."""
    code: Optional[str] = None
    message: Optional[str] = None
    output: Optional[AlibabaAsyncTask] = None
    request_id: Optional[str] = None
    usage: Optional[AlibabaTaskUsage] = None
