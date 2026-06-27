using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class CreateApiKeyResponse
    {
        public AppApiKeyItem Item { get; set; }
        public string RawKey { get; set; }
    }
}
