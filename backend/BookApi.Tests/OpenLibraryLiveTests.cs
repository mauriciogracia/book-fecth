using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace BookApi.Tests;

/// <summary>
/// Live tests against https://openlibrary.org — the 4 GET endpoints from the spec.
/// IDs are not hardcoded: /search.json supplies the work and author keys used by the other calls.
/// Run only these: dotnet test --filter Category=Live
/// </summary>
[Trait("Category", "Live")]
public class OpenLibraryLiveTests : IDisposable
{
    private readonly HttpClient _http;

    public OpenLibraryLiveTests()
    {
        _http = new HttpClient
        {
            BaseAddress = new Uri("https://openlibrary.org"),
            Timeout = TimeSpan.FromSeconds(20),
        };
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("BookFetch-Tests/1.0 (mgg.isco@gmail.com)");
    }

    public void Dispose() => _http.Dispose();

    // GET /search.json
    [Fact]
    public async Task Search_ByTitleAndAuthor_ReturnsTheHobbit()
    {
        using var json = await GetJson("/search.json?title=the+hobbit&author=tolkien&limit=5&fields=key,title,author_name,author_key,first_publish_year");

        var root = json.RootElement;
        Assert.True(root.GetProperty("numFound").GetInt32() > 0);

        var docs = root.GetProperty("docs").EnumerateArray().ToList();
        Assert.NotEmpty(docs);
        Assert.Contains(docs, d =>
            d.GetProperty("title").GetString()!.Contains("Hobbit", StringComparison.OrdinalIgnoreCase));
    }

    // GET /works/{work_id}.json
    [Fact]
    public async Task Work_FromSearchKey_ReturnsWorkRecord()
    {
        var (workKey, _) = await FirstHobbitKeys();

        using var json = await GetJson($"{workKey}.json");

        var root = json.RootElement;
        Assert.Equal(workKey, root.GetProperty("key").GetString());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("title").GetString()));
        Assert.True(root.TryGetProperty("authors", out _));
    }

    // GET /authors/{author_id}.json
    [Fact]
    public async Task Author_FromSearchKey_ReturnsTolkien()
    {
        var (_, authorId) = await FirstHobbitKeys();

        using var json = await GetJson($"/authors/{authorId}.json");

        var name = json.RootElement.GetProperty("name").GetString();
        Assert.Contains("Tolkien", name, StringComparison.OrdinalIgnoreCase);
    }

    // GET /authors/{author_id}/works.json
    [Fact]
    public async Task AuthorWorks_FromSearchKey_ReturnsEntries()
    {
        var (_, authorId) = await FirstHobbitKeys();

        using var json = await GetJson($"/authors/{authorId}/works.json?limit=10");

        var entries = json.RootElement.GetProperty("entries").EnumerateArray().ToList();
        Assert.NotEmpty(entries);
        Assert.All(entries, e => Assert.StartsWith("/works/", e.GetProperty("key").GetString()));
    }

    // Not-found behaviour of the real API
    [Fact]
    public async Task Work_UnknownId_Returns404()
    {
        var res = await _http.GetAsync("/works/OL0000000000W.json");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    /// <summary>Work key ("/works/OL…W") and first author id ("OL…A") of the top Hobbit result.</summary>
    private async Task<(string WorkKey, string AuthorId)> FirstHobbitKeys()
    {
        using var json = await GetJson("/search.json?title=the+hobbit&author=tolkien&limit=1&fields=key,author_key");
        var doc = json.RootElement.GetProperty("docs")[0];
        return (
            doc.GetProperty("key").GetString()!,
            doc.GetProperty("author_key")[0].GetString()!
        );
    }

    private async Task<JsonDocument> GetJson(string path)
    {
        var res = await _http.GetAsync(path);
        Assert.True(res.IsSuccessStatusCode, $"GET {path} -> {(int)res.StatusCode} {res.ReasonPhrase}");
        Assert.Equal("application/json", res.Content.Headers.ContentType?.MediaType);
        return JsonDocument.Parse(await res.Content.ReadAsStreamAsync());
    }
}