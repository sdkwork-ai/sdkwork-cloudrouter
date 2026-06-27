using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssQuotasListResult
    {
        public string Code { get; set; }
        public StorageQuotaPolicyListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
