namespace BookApi.Infrastructure.Llm;

/// <summary>Bound from "Llm" in appsettings / env (Llm__Provider, Llm__Gemini__ApiKey, ...).</summary>
public sealed class LlmOptions
{
    public const string Section = "Llm";

    /// <summary>"gemini" (default) or "opencode".</summary>
    public string Provider { get; set; } = "gemini";

    public ProviderOptions Gemini { get; set; } = new()
    {
        BaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/",
    };

    public ProviderOptions OpenCode { get; set; } = new()
    {
        BaseUrl = "https://opencode.ai/zen/v1/",
    };
}

public sealed class ProviderOptions
{
    public string BaseUrl { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "";
    public double Temperature { get; set; } = 0.1;
    public int TimeoutSeconds { get; set; } = 30;
}
