using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleCachedContentListResponse
    {
        public List<GoogleCachedContent>? CachedContents { get; set; }
        public string? NextPageToken { get; set; }
    }
}
