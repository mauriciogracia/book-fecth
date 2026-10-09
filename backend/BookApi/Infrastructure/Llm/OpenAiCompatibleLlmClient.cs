using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BookApi.Infrastructure.Llm;

/// <summary>Shared POST {BaseUrl}chat/completions implementation. Adapters only supply their options.</summary>
public abstract class OpenAiCompatibleLlmClient : InterfaceLlmClient
{
    private static readonly JsonSerializerOptions Json = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _http;
    private readonly ProviderOptions _options;

    protected OpenAiCompatibleLlmClient(HttpClient http, ProviderOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.ApiKey))
            throw new LlmException($"{GetType().Name}: ApiKey is not configured");
        if (string.IsNullOrWhiteSpace(options.Model))
            throw new LlmException($"{GetType().Name}: Model is not configured");

        _options = options;
        _http = http;
        _http.BaseAddress = new Uri(options.BaseUrl.EndsWith('/') ? options.BaseUrl : options.BaseUrl + "/");
        _http.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);
    }

    public abstract string Provider { get; }

    public async Task<string> CompleteAsync(
        string systemPrompt, string userPrompt, bool jsonMode = false, CancellationToken ct = default)
    {
        var request = new ChatRequest(
            _options.Model,
            [new ChatMessage("system", systemPrompt), new ChatMessage("user", userPrompt)],
            _options.Temperature,
            jsonMode ? new ResponseFormat("json_object") : null);

        HttpResponseMessage res;
        try
        {
            res = await _http.PostAsJsonAsync("chat/completions", request, Json, ct);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            throw new LlmException($"{Provider}: request timed out", inner: ex);
        }
        catch (HttpRequestException ex)
        {
            throw new LlmException($"{Provider}: {ex.Message}", inner: ex);
        }

        using (res)
        {
            if (!res.IsSuccessStatusCode)
            {
                var body = await res.Content.ReadAsStringAsync(ct);
                throw new LlmException($"{Provider}: {(int)res.StatusCode} {body}", (int)res.StatusCode);
            }

            var chat = await res.Content.ReadFromJsonAsync<ChatResponse>(Json, ct);
            var content = chat?.Choices?.FirstOrDefault()?.Message?.Content;
            if (string.IsNullOrWhiteSpace(content))
                throw new LlmException($"{Provider}: empty completion");

            return jsonMode ? StripCodeFence(content) : content.Trim();
        }
    }

    /// <summary>Some models wrap JSON in ```json fences even in JSON mode.</summary>
    private static string StripCodeFence(string text)
    {
        var t = text.Trim();
        if (!t.StartsWith("```")) return t;
        var firstNewline = t.IndexOf('\n');
        var lastFence = t.LastIndexOf("```", StringComparison.Ordinal);
        return firstNewline > 0 && lastFence > firstNewline
            ? t[(firstNewline + 1)..lastFence].Trim()
            : t;
    }

    private sealed record ChatRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("messages")] IReadOnlyList<ChatMessage> Messages,
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("response_format")] ResponseFormat? ResponseFormat);

    private sealed record ChatMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed record ResponseFormat([property: JsonPropertyName("type")] string Type);

    private sealed record ChatResponse([property: JsonPropertyName("choices")] List<Choice>? Choices);

    private sealed record Choice([property: JsonPropertyName("message")] ChoiceMessage? Message);

    private sealed record ChoiceMessage([property: JsonPropertyName("content")] string? Content);
}
