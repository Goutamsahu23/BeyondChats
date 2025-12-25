import 'dotenv/config';
import { fetchLatestArticle } from './fetchLatestArticle.js';
import { googleSearchArticles } from './googleSearch.js';
import { scrapeArticle } from './scrapeArticle.js';
import { rewriteArticle } from './llmRewrite.js';
import { publishArticle } from './publishArticle.js';

async function main() {
  console.log('Phase 2 pipeline started');

  // Step 1: Fetch original article
  const original = await fetchLatestArticle();
  console.log('Original Article:', original.title);

  // Step 2: Google search
  const searchResults = await googleSearchArticles(original.title);

  // Step 3: Scrape references
  const references = [];

  for (const result of searchResults) {
    try {
      const scraped = await scrapeArticle(result.url);
      references.push(scraped);
      console.log(`Scraped: ${result.url}`);
    } catch {
      console.warn(`Skipped: ${result.url}`);
    }
  }

  if (references.length < 1) {
    throw new Error('Not enough reference content to proceed');
  }

  // Step 4: LLM Rewrite
  console.log('Rewriting article using LLM...');
  const rewritten = await rewriteArticle({
    originalTitle: original.title,
    originalContent: original.content,
    referenceArticles: references
  });

  console.log('Article rewritten successfully');
  console.log('New Title:', rewritten.title);

  if (!rewritten.content) {
    throw new Error('Rewritten content is empty');
  }

  console.log('\n--- GENERATED CONTENT PREVIEW ---\n');
  console.log(rewritten.content);


   await publishArticle({
      articleId: original.id,
      title: rewritten.title,
      content: rewritten.content,
      references: references.map(r => r.url)
    });

    console.log(' Article successfully updated in Laravel');
}

main().catch(err => {
  console.error('Pipeline failed:', err.message);
});
