from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .alibaba_async_task import AlibabaAsyncTask
    from .alibaba_task_usage import AlibabaTaskUsage


@dataclass
class AlibabaVideoGenerationTask:
    """Alibaba DashScope asynchronous task status and its generated video."""
    output: Optional[AlibabaAsyncTask] = None
    request_id: Optional[str] = None
    usage: Optional[AlibabaTaskUsage] = None
