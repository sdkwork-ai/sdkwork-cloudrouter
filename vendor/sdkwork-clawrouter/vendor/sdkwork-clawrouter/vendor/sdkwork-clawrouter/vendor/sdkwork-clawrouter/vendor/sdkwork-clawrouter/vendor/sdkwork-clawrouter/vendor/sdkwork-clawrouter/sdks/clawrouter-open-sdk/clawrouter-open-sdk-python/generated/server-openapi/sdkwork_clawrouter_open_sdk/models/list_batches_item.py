from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ListBatchesItem:
    """Item module returned inside the listBatches list response."""
    created: Optional[int] = None
    created_at: Optional[int] = None
    endpoint: Optional[str] = None
    error_file_id: Optional[str] = None
    id: Optional[str] = None
    input_file_id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    object: Optional[str] = None
    output_file_id: Optional[str] = None
    status: Optional[str] = None
