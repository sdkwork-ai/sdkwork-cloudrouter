from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .media_resource import MediaResource


@dataclass
class AdminSiteSettingsUpdateRequest:
    """Admin site settings update request schema exposed by Claw Router."""
    accent_color: Optional[str] = None
    brand_color: Optional[str] = None
    custom_css: Optional[str] = None
    description: Optional[str] = None
    docs_url: Optional[str] = None
    favicon: Optional[MediaResource] = None
    footer_copyright: Optional[str] = None
    icon: Optional[MediaResource] = None
    icp_record_number: Optional[str] = None
    icp_record_url: Optional[str] = None
    logo: Optional[MediaResource] = None
    police_record_number: Optional[str] = None
    police_record_url: Optional[str] = None
    privacy_url: Optional[str] = None
    seo_description: Optional[str] = None
    seo_title: Optional[str] = None
    short_name: Optional[str] = None
    site_name: Optional[str] = None
    support_url: Optional[str] = None
    terms_url: Optional[str] = None
