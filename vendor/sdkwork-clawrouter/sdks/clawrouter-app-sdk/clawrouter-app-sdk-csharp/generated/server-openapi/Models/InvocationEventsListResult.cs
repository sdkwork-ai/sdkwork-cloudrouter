using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class InvocationEventsListResult
    {
        public string Code { get; set; }
        public RuntimeEventListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
