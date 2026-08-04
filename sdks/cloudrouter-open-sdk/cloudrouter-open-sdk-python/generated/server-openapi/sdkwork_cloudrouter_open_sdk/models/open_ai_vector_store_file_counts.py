from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVectorStoreFileCounts:
    """Counts of files in each vector store processing state."""
    cancelled: Optional[int] = None
    completed: Optional[int] = None
    failed: Optional[int] = None
    in_progress: Optional[int] = None
    total: Optional[int] = None
