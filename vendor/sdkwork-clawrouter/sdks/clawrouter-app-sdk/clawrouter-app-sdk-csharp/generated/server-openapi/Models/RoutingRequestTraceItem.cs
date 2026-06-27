using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingRequestTraceItem
    {
        public string Channel { get; set; }
        public string Duration { get; set; }
        public string EndedAt { get; set; }
        public string ErrorMessageMasked { get; set; }
        public string ErrorType { get; set; }
        public string HttpMethod { get; set; }
        public string Id { get; set; }
        public string Model { get; set; }
        public string ProviderErrorCode { get; set; }
        public string RequestBytes { get; set; }
        public string RequestId { get; set; }
        public string RequestPath { get; set; }
        public string RequestPayloadHash { get; set; }
        public string ResponseBytes { get; set; }
        public string ResponsePayloadHash { get; set; }
        public string StartedAt { get; set; }
        public string Status { get; set; }
        public bool Streaming { get; set; }
        public string Time { get; set; }
        public string Tokens { get; set; }
        public string TraceId { get; set; }
    }
}
