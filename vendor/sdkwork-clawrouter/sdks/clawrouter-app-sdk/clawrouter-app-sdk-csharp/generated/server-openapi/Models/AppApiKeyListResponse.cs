using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class AppApiKeyListResponse
    {
        public List<AppChannelGroup> Groups { get; set; }
        public List<AppApiKeyItem> Items { get; set; }
    }
}
