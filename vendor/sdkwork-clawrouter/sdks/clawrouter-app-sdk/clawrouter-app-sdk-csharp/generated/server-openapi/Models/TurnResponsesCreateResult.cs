using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class TurnResponsesCreateResult
    {
        public string Code { get; set; }
        public ChatTurnCreateResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
