using Microsoft.Extensions.Options;

namespace BookApi.Infrastructure.Llm;

/// <summary>Gemini through its OpenAI-compatible endpoint (generativelanguage.googleapis.com/v1beta/openai/).</summary>
public sealed class GeminiLlmClient(HttpClient http, IOptions<LlmOptions> options)
    : OpenAiCompatibleLlmClient(http, options.Value.Gemini)
{
    public override string Provider => "gemini";
}
