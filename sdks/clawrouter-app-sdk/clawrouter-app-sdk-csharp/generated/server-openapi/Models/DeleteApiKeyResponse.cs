using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class DeleteApiKeyResponse
    {
        public bool Deleted { get; set; }
        public string Id { get; set; }
    }
}
