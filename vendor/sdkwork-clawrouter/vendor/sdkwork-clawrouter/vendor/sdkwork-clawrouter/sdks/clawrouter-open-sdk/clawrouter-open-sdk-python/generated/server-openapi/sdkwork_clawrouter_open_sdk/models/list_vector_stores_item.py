from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ListVectorStoresItem:
    """Item module returned inside the listVectorStores list response."""
    created: Optional[int] = None
    created_at: Optional[int] = None
    file_id: Optional[str] = None
    file_ids: Optional[List[str]] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    object: Optional[str] = None
    status: Optional[str] = None
    usage_bytes: Optional[int] = None
