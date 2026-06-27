using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class InvocationEventsCreateResult
    {
        public string Code { get; set; }
        public RuntimeEventResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
