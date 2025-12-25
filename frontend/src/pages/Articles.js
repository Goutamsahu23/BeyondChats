import { useEffect, useState } from 'react';
import { fetchArticles } from '../services/api';

const MAX_CONTENT_LENGTH = 200; // characters

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState({});
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const load = () => {
      fetchArticles()
        .then(data => {
          setArticles(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    };

    load(); // initial load

    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleTab = (id, tab) => {
    setActiveTab(prev => ({ ...prev, [id]: tab }));
  };

  const toggleExpand = id => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderContent = article => {
    const isExpanded = expanded[article.id];
    const content =
      activeTab[article.id] === 'updated'
        ? article.ai_content
        : article.content;

    if (!content) return null;

    if (content.length <= MAX_CONTENT_LENGTH || isExpanded) {
      return (
        <>
          {content}
          {content.length > MAX_CONTENT_LENGTH && (
            <button onClick={() => toggleExpand(article.id)} className="read-more">
              Show Less
            </button>
          )}
        </>
      );
    }

    return (
      <>
        {content.substring(0, MAX_CONTENT_LENGTH)}...
        <button onClick={() => toggleExpand(article.id)} className="read-more">
          Read More
        </button>
      </>
    );
  };

  if (loading) return <p>Loading articles...</p>;

  return (
    <div className="articles-grid">
      {articles.map(article => (
        <div className="article-card" key={article.id}>
          <h2>{article.title}</h2>

          {article.ai_title && (
            <p className="updated-title">
              Updated: {article.ai_title}
            </p>
          )}

          <div className="tabs">
            <button
              onClick={() => toggleTab(article.id, 'original')}
              className={activeTab[article.id] !== 'updated' ? 'active' : ''}
            >
              Original
            </button>

            <button
              onClick={() => toggleTab(article.id, 'updated')}
              className={activeTab[article.id] === 'updated' ? 'active' : ''}
              disabled={!article.ai_content}
            >
              Updated
            </button>
          </div>

          <div className="content">{renderContent(article)}</div>
        </div>
      ))}
    </div>
  );
}