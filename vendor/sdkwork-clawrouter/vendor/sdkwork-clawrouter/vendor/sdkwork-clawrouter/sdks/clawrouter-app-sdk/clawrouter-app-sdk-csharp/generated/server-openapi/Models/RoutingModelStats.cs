using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingModelStats
    {
        public string Lat { get; set; }
        public string M { get; set; }
        public string Req { get; set; }
        public string Sr { get; set; }
        public string Tok { get; set; }
    }
}
