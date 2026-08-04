namespace Sdkwork.CloudRouter.Backend.Api
{
    /// <summary>
    /// API modules for cloudrouter-backend-sdk
    /// </summary>
    public static class Api
    {
        public static AiApi? Ai { get; set; }
        public static IntegrationApi? Integration { get; set; }
        public static SitesApi? Sites { get; set; }
        public static SystemApi? System { get; set; }
    }
}
