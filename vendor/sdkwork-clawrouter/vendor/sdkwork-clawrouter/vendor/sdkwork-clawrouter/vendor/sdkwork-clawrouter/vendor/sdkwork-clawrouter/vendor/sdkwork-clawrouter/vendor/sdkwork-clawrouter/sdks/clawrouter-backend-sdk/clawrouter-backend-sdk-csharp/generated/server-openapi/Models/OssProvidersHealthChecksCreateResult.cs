using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssProvidersHealthChecksCreateResult
    {
        public string Code { get; set; }
        public StorageProviderHealthCheckResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
