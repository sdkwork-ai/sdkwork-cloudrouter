using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminApiKeyCreateResponse
    {
        public AdminApiKeyItem Key { get; set; }
        public string RawKey { get; set; }
    }
}
