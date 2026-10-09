using Microsoft.Extensions.Options;

namespace BookApi.Infrastructure.Llm;

public static class LlmServiceCollectionExtensions
{
    /// <summary>Registers both adapters and resolves ILlmClient from Llm:Provider. Program.cs: builder.Services.AddLlm(builder.Configuration);</summary>
    public static IServiceCollection AddLlm(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<LlmOptions>(config.GetSection(LlmOptions.Section));

        services.AddHttpClient<GeminiLlmClient>();
        services.AddHttpClient<OpenCodeLlmClient>();

        services.AddScoped<ILlmClient>(sp =>
        {
            var provider = sp.GetRequiredService<IOptions<LlmOptions>>().Value.Provider.Trim().ToLowerInvariant();
            return provider switch
            {
                "gemini" => sp.GetRequiredService<GeminiLlmClient>(),
                "opencode" => sp.GetRequiredService<OpenCodeLlmClient>(),
                _ => throw new LlmException($"Unknown Llm:Provider '{provider}' (gemini | opencode)"),
            };
        });

        return services;
    }
}
