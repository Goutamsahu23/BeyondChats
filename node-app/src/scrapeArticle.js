import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';


export async function scrapeArticle(url) {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, header, iframe, ads, noscript').remove();

    let content = '';


    const selectors = [
      'article',
      '.post-content',
      '.entry-content',
      '.blog-content',
      '.content',
      'main'
    ];

    for (const selector of selectors) {
      if ($(selector).length) {
        content = $(selector).text();
        break;
      }
    }

  
    if (!content) {
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 80) {
          content += text + '\n\n';
        }
      });
    }

    // Cleanup whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    if (content.length < 200) {
      throw new Error('Extracted content too short, possibly failed');
    }

    return {
      url,
      content
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}`);
    throw error;
  }
}
