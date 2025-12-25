import { getJson } from 'serpapi';

const SERP_API_KEY = process.env.SERP_API_KEY;

const BLOCKED_DOMAINS = [
  'pinterest.com',
  'wattpad.com',
  'youtube.com',
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'instagram.com',
  'reddit.com',
  'quora.com',
  'medium.com'
];

export async function googleSearchArticles(title) {
  return new Promise((resolve, reject) => {
    getJson(
      {
        engine: 'google',
        q: `${title} blog OR article`,
        api_key: SERP_API_KEY,
        num: 50
      },
      (json) => {
        if (!json?.organic_results) {
          return reject(new Error('No search results found'));
        }

        const results = [];

        for (const result of json.organic_results) {
          const link = result.link;
          const domain = new URL(link).hostname;

          // Skip internal site
          if (domain.includes('beyondchats.com')) continue;

          // Skip blocked platforms
          if (BLOCKED_DOMAINS.some(d => domain.includes(d))) continue;

          // Skip non-article listing pages
          if (
            link.includes('/tag/') ||
            link.includes('/category/') ||
            link.includes('/author/')
          ) {
            continue;
          }

          // Basic quality heuristic
          if (link.length < 20) continue;

          results.push({
            title: result.title,
            url: link,
            domain
          });

          if (results.length === 5) break; // buffer
        }

        if (results.length < 2) {
          return reject(new Error('Not enough valid article links found'));
        }

        resolve(results.slice(0, 2));
      }
    );
  });
}
