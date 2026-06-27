from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .media_resource import MediaResource


@dataclass
class AdminSiteSettingsResponse:
    """Admin site settings response schema exposed by Claw Router."""
    accent_color: str
    brand_color: str
    custom_css: str
    description: str
    docs_url: str
    favicon: MediaResource
    footer_copyright: str
    icon: MediaResource
    icp_record_number: str
    icp_record_url: str
    logo: MediaResource
    police_record_number: str
    police_record_url: str
    privacy_url: str
    seo_description: str
    seo_title: str
    short_name: str
    site_name: str
    support_url: str
    terms_url: str
