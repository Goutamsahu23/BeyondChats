<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\DomCrawler\Crawler;

class ArticleController extends Controller
{
    /**
     * GET /api/articles
     * List articles (paginated)
     */
    public function index(Request $request)
    {
        $query = Article::query();

        if ($request->query('unprocessed') === 'true') {
            $query->whereNull('ai_content');
        }

        $articles = $query->orderBy('updated_at', 'desc')
            ->paginate(10);

        return response()->json($articles);
    }

    /**
     * GET /api/articles/{id}
     * Get single article
     */
    public function show($id)
    {
        $article = Article::find($id);

        if (!$article) {
            return response()->json([
                'message' => 'Article not found'
            ], 404);
        }

        return response()->json($article);
    }

    /**
     * POST /api/articles
     * Create article
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'content'      => 'nullable|string',
            'author'       => 'nullable|string|max:255',
            'published_at' => 'nullable|date',
            'url'          => 'required|url|unique:articles,url',
        ]);

        $content = $validated['content'] ?? null;

        if (!$content) {
            // Scrape content from URL
            $response = Http::withoutVerifying()->get($validated['url']);

            if ($response->successful()) {
                $crawler = new Crawler($response->body());

                // Try common selectors
                $selectors = ['article', '.post-content', '.entry-content', '.blog-content', '.content', 'main'];

                foreach ($selectors as $selector) {
                    if ($crawler->filter($selector)->count()) {
                        $content = trim($crawler->filter($selector)->text());
                        break;
                    }
                }

                // Fallback to paragraphs
                if (!$content) {
                    $content = '';
                    $crawler->filter('p')->each(function ($node) use (&$content) {
                        $text = trim($node->text());
                        if (strlen($text) > 80) {
                            $content .= $text . "\n\n";
                        }
                    });
                    $content = trim($content);
                }

                // Clean up
                $content = preg_replace('/\s+/', ' ', $content);
                $content = preg_replace('/\n+/', "\n", $content);
            }
        }

        $article = Article::create([
            'title'        => $validated['title'],
            'slug'         => Str::slug($validated['title']),
            'content'      => $content,
            'author'       => $validated['author'] ?? null,
            'published_at' => $validated['published_at'] ?? null,
            'url'          => $validated['url'],
        ]);

        return response()->json([
            'message' => 'Article created successfully',
            'data'    => $article
        ], 201);
    }

    /**
     * PUT /api/articles/{id}
     * Update article
     */
    public function update(Request $request, $id)
    {
        $article = Article::find($id);

        if (!$article) {
            return response()->json([
                'message' => 'Article not found'
            ], 404);
        }

        $validated = $request->validate([
            'title'        => 'sometimes|string|max:255',
            'content'      => 'nullable|string',
            'author'       => 'nullable|string|max:255',
            'published_at' => 'nullable|date',
            'ai_title'     => 'nullable|string|max:255',
            'ai_content'   => 'nullable|string',
        ]);

        if (isset($validated['title'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        $article->update($validated);

        return response()->json([
            'message' => 'Article updated successfully',
            'data'    => $article
        ]);
    }

    /**
     * DELETE /api/articles/{id}
     * Delete article
     */
    public function destroy($id)
    {
        $article = Article::find($id);

        if (!$article) {
            return response()->json([
                'message' => 'Article not found'
            ], 404);
        }

        $article->delete();

        return response()->json([
            'message' => 'Article deleted successfully'
        ]);
    }
}
