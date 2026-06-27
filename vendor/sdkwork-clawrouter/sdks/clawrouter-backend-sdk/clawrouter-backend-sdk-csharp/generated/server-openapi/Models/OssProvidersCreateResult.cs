using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssProvidersCreateResult
    {
        public string Code { get; set; }
        public StorageProviderMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
