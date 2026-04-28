/**
 * Web search tool for the QAYANI CLI agent platform.
 *
 * Uses DuckDuckGo's HTML search endpoint (no API key required).
 */

import type { Tool } from '../types.js';

// ── Tool factory ─────────────────────────────────────────────────────────────

/**
 * Create a web search tool that queries DuckDuckGo.
 */
export function createWebSearchTool(): Tool {
  const definition = {
    name: 'web_search',
    description: 'Search the web using DuckDuckGo. Returns titles, URLs, and snippets.',
    parameters: {
      query: {
        type: 'string' as const,
        description: 'The search query.',
        required: true,
      },
      max_results: {
        type: 'number' as const,
        description: 'Maximum number of results to return (default: 5).',
        required: false,
      },
    },
  };

  return {
    definition,
    async execute(args: Record<string, unknown>): Promise<string> {
      const query = args.query as string | undefined;
      const maxResults = (args.max_results as number | undefined) || 5;

      if (!query) {
        return 'Error: "query" is a required parameter.';
      }

      try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!response.ok) {
          return `Error: DuckDuckGo returned HTTP ${response.status}`;
        }

        const html = await response.text();
        const results = parseSearchResults(html, maxResults);

        if (results.length === 0) {
          return `No results found for: "${query}"`;
        }

        const formatted = results
          .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`)
          .join('\n\n');

        return `Search results for "${query}":\n\n${formatted}`;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return `Error performing web search: ${message}`;
      }
    },
  };
}

// ── HTML parsing ─────────────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Parse DuckDuckGo HTML search results page to extract titles, URLs, and snippets.
 */
function parseSearchResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo HTML results are in <a class="result__a"> for title/url
  // and <a class="result__snippet"> for snippets
  const resultBlockRegex =
    /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = resultBlockRegex.exec(html)) !== null && results.length < maxResults) {
    const rawUrl = match[1];
    const rawTitle = match[2];
    const rawSnippet = match[3];

    const url = decodeDDGUrl(rawUrl);
    const title = stripHtml(rawTitle).trim();
    const snippet = stripHtml(rawSnippet).trim();

    if (title && url) {
      results.push({ title, url, snippet });
    }
  }

  // Fallback: try alternative pattern if the first didn't match
  if (results.length === 0) {
    const altLinkRegex =
      /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const altSnippetRegex =
      /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const links: Array<{ url: string; title: string }> = [];
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = altLinkRegex.exec(html)) !== null) {
      links.push({
        url: decodeDDGUrl(linkMatch[1]),
        title: stripHtml(linkMatch[2]).trim(),
      });
    }

    const snippets: string[] = [];
    let snippetMatch: RegExpExecArray | null;
    while ((snippetMatch = altSnippetRegex.exec(html)) !== null) {
      snippets.push(stripHtml(snippetMatch[1]).trim());
    }

    for (let i = 0; i < Math.min(links.length, maxResults); i++) {
      results.push({
        title: links[i].title,
        url: links[i].url,
        snippet: snippets[i] || '',
      });
    }
  }

  return results;
}

/**
 * Decode DuckDuckGo redirect URLs to extract the actual destination.
 */
function decodeDDGUrl(rawUrl: string): string {
  // DDG wraps URLs like //duckduckgo.com/l/?uddg=ENCODED_URL&...
  const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
  if (uddgMatch) {
    try {
      return decodeURIComponent(uddgMatch[1]);
    } catch {
      return rawUrl;
    }
  }
  // Sometimes URLs start with // (protocol-relative)
  if (rawUrl.startsWith('//')) {
    return `https:${rawUrl}`;
  }
  return rawUrl;
}

/**
 * Strip HTML tags and decode common HTML entities.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}
