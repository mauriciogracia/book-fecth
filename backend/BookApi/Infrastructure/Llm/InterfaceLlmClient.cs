namespace BookApi.Infrastructure.Llm;

/// <summary>Provider-agnostic LLM port. Adapters: Gemini, OpenCode (both OpenAI-compatible chat completions).</summary>
public interface InterfaceLlmClient
{
    /// <summary>Provider name, for logs ("gemini", "opencode").</summary>
    string Provider { get; }

    /// <summary>Single-turn completion. jsonMode asks the model for a JSON object response.</summary>
    Task<string> CompleteAsync(string systemPrompt, string userPrompt, bool jsonMode = false, CancellationToken ct = default);
}

public sealed class LlmException(string message, int? statusCode = null, Exception? inner = null)
    : Exception(message, inner)
{
    public int? StatusCode { get; } = statusCode;
}
