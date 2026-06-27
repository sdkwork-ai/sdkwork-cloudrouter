using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ChannelGroupsRouteExplainRetrieveResult
    {
        public string Code { get; set; }
        public AdminChannelGroupRouteExplainResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
