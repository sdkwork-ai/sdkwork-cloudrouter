from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class XaiUsage:
    """xAI usage block. cost_in_usd_ticks is the authoritative charge: divide by 10,000,000 for USD."""
    cost_in_usd_ticks: int
    completion_tokens: Optional[int] = None
    num_sources_used: Optional[int] = None
    prompt_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
