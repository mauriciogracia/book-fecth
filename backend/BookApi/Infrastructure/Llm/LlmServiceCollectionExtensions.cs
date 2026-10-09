using Microsoft.Extensions.Options;

namespace BookApi.Infrastructure.Llm;

public static class LlmServiceCollectionExtensions
{
    public static IServiceCollection AddLlm(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<LlmOptions>(config.GetSection(LlmOptions.Section));

        services.AddHttpClient<GeminiLlmClient>();
        services.AddHttpClient<OpenCodeLlmClient>();

        services.AddScoped<InterfaceLlmClient>(sp =>
        {
            var provider = sp.GetRequiredService<IOptions<LlmOptions>>()
                .Value.Provider.Trim().ToLowerInvariant();

            return provider switch
            {
                "gemini" => (InterfaceLlmClient)sp.GetRequiredService<GeminiLlmClient>(),
                "opencode" => (InterfaceLlmClient)sp.GetRequiredService<OpenCodeLlmClient>(),
                _ => throw new LlmException($"Unknown Llm:Provider '{provider}'"),
            };
        });

        return services;
    }
}