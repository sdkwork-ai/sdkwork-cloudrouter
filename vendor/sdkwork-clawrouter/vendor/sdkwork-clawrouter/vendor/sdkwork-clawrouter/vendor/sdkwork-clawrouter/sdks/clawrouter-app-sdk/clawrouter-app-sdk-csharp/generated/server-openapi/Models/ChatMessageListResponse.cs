using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChatMessageListResponse
    {
        public List<ChatMessageItem> Items { get; set; }
    }
}
