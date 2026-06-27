using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageQuotaPolicyMutationResponse
    {
        public StorageQuotaPolicy QuotaPolicy { get; set; }
        public string RequestId { get; set; }
    }
}
