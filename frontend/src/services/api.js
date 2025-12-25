export async function fetchArticles() {
  const res = await fetch('http://127.0.0.1:8000/api/articles');
  if (!res.ok) {
    throw new Error('Failed to fetch articles');
  }

  const data = await res.json();


  return data.data || data;
}
