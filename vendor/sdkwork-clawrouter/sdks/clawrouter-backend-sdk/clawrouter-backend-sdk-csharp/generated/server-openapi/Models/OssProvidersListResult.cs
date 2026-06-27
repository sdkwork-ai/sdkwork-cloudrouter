using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssProvidersListResult
    {
        public string Code { get; set; }
        public StorageProviderListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
