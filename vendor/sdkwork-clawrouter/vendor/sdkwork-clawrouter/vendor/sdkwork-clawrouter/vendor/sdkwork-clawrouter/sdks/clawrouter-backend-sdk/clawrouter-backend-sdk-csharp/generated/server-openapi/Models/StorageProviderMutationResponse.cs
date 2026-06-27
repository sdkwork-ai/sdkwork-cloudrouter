using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageProviderMutationResponse
    {
        public StorageProviderConfig Provider { get; set; }
        public string RequestId { get; set; }
    }
}
