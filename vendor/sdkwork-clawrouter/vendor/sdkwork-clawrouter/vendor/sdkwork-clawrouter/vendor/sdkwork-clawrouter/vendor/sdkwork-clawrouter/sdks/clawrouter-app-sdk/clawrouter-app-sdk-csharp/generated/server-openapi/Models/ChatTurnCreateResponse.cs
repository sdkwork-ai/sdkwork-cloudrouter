using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChatTurnCreateResponse
    {
        public List<ChatMessageItem> Messages { get; set; }
        public ChatTurnItem Turn { get; set; }
    }
}
