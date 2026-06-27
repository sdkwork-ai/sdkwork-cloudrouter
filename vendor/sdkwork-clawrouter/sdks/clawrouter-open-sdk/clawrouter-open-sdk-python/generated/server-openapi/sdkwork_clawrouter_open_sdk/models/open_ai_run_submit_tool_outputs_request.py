from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRunSubmitToolOutputsRequest:
    """OpenAI-compatible request to submit tool outputs for a run."""
    tool_outputs: List[str]
    stream: Optional[bool] = None
