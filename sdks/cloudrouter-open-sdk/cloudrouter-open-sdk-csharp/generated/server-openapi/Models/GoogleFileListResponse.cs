using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class GoogleFileListResponse
    {
        public List<GoogleFile>? Files { get; set; }
        public string? NextPageToken { get; set; }
    }
}
