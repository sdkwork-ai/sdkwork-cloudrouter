from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ListEvalRunOutputItemsItem:
    """Item module returned inside the listEvalRunOutputItems list response."""
    created: Optional[int] = None
    created_at: Optional[int] = None
    data_source: Optional[str] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    object: Optional[str] = None
    result_counts: Optional[str] = None
    status: Optional[str] = None
