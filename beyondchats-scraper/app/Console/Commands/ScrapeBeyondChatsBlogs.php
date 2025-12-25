<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Symfony\Component\DomCrawler\Crawler;
use App\Models\Article;
use Illuminate\Support\Str;

class ScrapeBeyondChatsBlogs extends Command
{
    protected $signature = 'app:scrape-beyond-chats-blogs';

    protected $description = 'Scrape 5 oldest blogs from BeyondChats and store them in DB';

    public function handle()
    {
        $baseUrl = 'https://beyondchats.com/blogs/';
        $this->info('Fetching blogs page...');

        $response = Http::withoutVerifying()->get($baseUrl);

        if (!$response->successful()) {
            $this->error('Failed to fetch blogs page');
            return;
        }

        $crawler = new Crawler($response->body());

        /*
        |--------------------------------------------------------------------------
        | STEP 1: Detect last pagination page
        |--------------------------------------------------------------------------
        */
        $maxPage = 1;

        $crawler->filter('a')->each(function ($node) use (&$maxPage) {
            $href = $node->attr('href');
            if ($href && preg_match('/\/blogs\/page\/(\d+)\//', $href, $matches)) {
                $maxPage = max($maxPage, (int) $matches[1]);
            }
        });

        $this->info("Last page number detected: {$maxPage}");

        /*
        |--------------------------------------------------------------------------
        | STEP 2: Collect 5 oldest article URLs
        |--------------------------------------------------------------------------
        */
        $articleUrls = [];
        $page = $maxPage;

        while (count($articleUrls) < 5 && $page >= 1) {
            $pageUrl = $page === 1
                ? $baseUrl
                : "{$baseUrl}page/{$page}/";

            $this->info("Fetching page {$page}...");

            $pageResponse = Http::withoutVerifying()->get($pageUrl);
            if (!$pageResponse->successful()) {
                $this->error("Failed to fetch page {$page}");
                break;
            }

            $pageCrawler = new Crawler($pageResponse->body());

            $pageCrawler->filter('h2 a')->each(function ($node) use (&$articleUrls) {
                if (count($articleUrls) < 5) {
                    $articleUrls[] = $node->attr('href');
                }
            });

            $page--;
        }

        if (empty($articleUrls)) {
            $this->error('No article URLs found');
            return;
        }

        $this->info('Collected article URLs:');
        foreach ($articleUrls as $url) {
            $this->line($url);
        }

        /*
        |--------------------------------------------------------------------------
        | STEP 3: Scrape each article
        |--------------------------------------------------------------------------
        */
        foreach ($articleUrls as $url) {
            $this->info("Scraping article: {$url}");

            // Skip if already scraped
            $existing = Article::where('url', $url)->first();
            if ($existing && $existing->content) {
                $this->warn('Already exists with content, skipping');
                continue;
            }

            $articleResponse = Http::withoutVerifying()->get($url);
            if (!$articleResponse->successful()) {
                $this->error('Failed to fetch article');
                continue;
            }

            $articleCrawler = new Crawler($articleResponse->body());

            /*
            |--------------------------------------------------------------------------
            | TITLE
            |--------------------------------------------------------------------------
            */
            if (!$articleCrawler->filter('h1')->count()) {
                $this->warn('Title not found, skipping');
                continue;
            }

            $title = trim($articleCrawler->filter('h1')->text());

            /*
            |--------------------------------------------------------------------------
            | CONTENT (ELEMENTOR-SAFE)
            |--------------------------------------------------------------------------
            */
            $content = '';

            if ($articleCrawler->filter('.elementor-widget-theme-post-content')->count()) {

                $articleCrawler
                    ->filter('.elementor-widget-theme-post-content p,
                              .elementor-widget-theme-post-content li')
                    ->each(function ($node) use (&$content) {

                        $text = trim($node->text());

                        if (
                            strlen($text) > 60 &&
                            !str_contains(strtolower($text), 'subscribe') &&
                            !str_contains(strtolower($text), 'newsletter') &&
                            !str_contains(strtolower($text), 'contact')
                        ) {
                            $content .= $text . "\n\n";
                        }
                    });
            }

            $content = trim($content);

            if (!$content) {
                $this->warn('Content empty after Elementor extraction, skipping');
                continue;
            }

            $this->info(
                'Content length: ' . strlen($content) .
                ' Preview: ' . substr($content, 0, 150)
            );

            /*
            |--------------------------------------------------------------------------
            | OPTIONAL META
            |--------------------------------------------------------------------------
            */
            $author = $articleCrawler->filter('.author')->count()
                ? trim($articleCrawler->filter('.author')->text())
                : null;

            $publishedAt = null;
            if ($articleCrawler->filter('time')->count()) {
                $publishedAt = date(
                    'Y-m-d',
                    strtotime($articleCrawler->filter('time')->attr('datetime'))
                );
            }

            /*
            |--------------------------------------------------------------------------
            | SAVE TO DB
            |--------------------------------------------------------------------------
            */
            Article::updateOrCreate(
                ['url' => $url],
                [
                    'title'        => $title,
                    'slug'         => Str::slug($title),
                    'content'      => $content,
                    'author'       => $author,
                    'published_at' => $publishedAt,
                ]
            );

            $this->info("Saved/Updated: {$title}");
        }

        $this->info('Scraping completed successfully ');
    }
}
