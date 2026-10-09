using Microsoft.Extensions.Options;

namespace BookApi.Infrastructure.Llm;

/// <summary>
/// OpenCode Zen gateway (opencode.ai/zen/v1/). Use a chat-completions model:
/// GPT models there use /responses and Claude/Gemini need other APIs, so they don't work through this adapter.
/// </summary>
public sealed class OpenCodeLlmClient(HttpClient http, IOptions<LlmOptions> options)
    : OpenAiCompatibleLlmClient(http, options.Value.OpenCode)
{
    public override string Provider => "opencode";
}
