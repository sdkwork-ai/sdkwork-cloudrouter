using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingApiKeysResponse
    {
        public List<RoutingApiKeyItem> Items { get; set; }
    }
}
