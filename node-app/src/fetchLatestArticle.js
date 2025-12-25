import axios from 'axios';

const API_BASE = process.env.LARAVEL_API_BASE;

export async function fetchLatestArticle() {
  try {
    const response = await axios.get(`${API_BASE}/articles`, {
      params: {
        page: 1,
        unprocessed: 'true'
      }
    });

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      throw new Error('No articles found');
    }

    const latestArticle = response.data.data[0];

    if (!latestArticle.content) {
      throw new Error('Latest article has no content');
    }

    return {
      id: latestArticle.id,
      title: latestArticle.title,
      content: latestArticle.content,
      url: latestArticle.url,
      publishedAt: latestArticle.published_at
    };
  } catch (error) {
    console.error('Error fetching latest article:', error.message);
    throw error;
  }
}
