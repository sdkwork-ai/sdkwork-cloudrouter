using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class UpdateStorageProviderRequest
    {
        public string Reason { get; set; }
        public string Status { get; set; }
    }
}
