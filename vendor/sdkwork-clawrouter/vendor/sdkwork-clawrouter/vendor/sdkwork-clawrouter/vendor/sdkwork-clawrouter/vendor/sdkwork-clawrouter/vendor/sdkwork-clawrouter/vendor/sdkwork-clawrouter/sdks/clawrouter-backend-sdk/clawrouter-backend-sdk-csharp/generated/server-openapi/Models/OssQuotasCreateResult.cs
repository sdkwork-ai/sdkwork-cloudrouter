using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssQuotasCreateResult
    {
        public string Code { get; set; }
        public StorageQuotaPolicyMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
