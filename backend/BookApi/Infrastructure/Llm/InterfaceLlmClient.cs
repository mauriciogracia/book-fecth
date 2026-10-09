namespace BookApi.Infrastructure.Llm;

public interface InterfaceLlmClient
{
    string Provider { get; }

    Task<string> CompleteAsync(string systemPrompt, string userPrompt,
        bool jsonMode = false, CancellationToken ct = default);
}

public sealed class LlmException(string message, int? statusCode = null, Exception? inner = null)
    : Exception(message, inner)
{
    public int? StatusCode { get; } = statusCode;
}