using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class GatewayTrace
    {
        public string Channel { get; set; }
        public string Duration { get; set; }
        public string Endpoint { get; set; }
        public string Id { get; set; }
        public string Ip { get; set; }
        public string Method { get; set; }
        public int Status { get; set; }
        public string Time { get; set; }
    }
}
