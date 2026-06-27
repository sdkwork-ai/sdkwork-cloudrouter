using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminApiKeyItem
    {
        public string Id { get; set; }
        public string Key { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public string Used { get; set; }
    }
}
