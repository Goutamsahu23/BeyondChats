import axios from 'axios';

export async function publishArticle({
  articleId,
  title,
  content,
  references
}) {
  const response = await axios.put(
    `http://127.0.0.1:8000/api/articles/${articleId}`,
    {
      ai_title:title,
      ai_content:content,
      references
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}
