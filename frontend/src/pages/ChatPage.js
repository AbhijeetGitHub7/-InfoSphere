import React, { useState } from 'react';
import axios from 'axios';

const MAX_LENGTH = 50; // Maximum length for truncation

const truncateText = (text, maxLength) => {
  return text.length > maxLength ? `${text.slice(0, maxLength)}... `: text;
};

const formatLLMResponse = (response) => {
  // Replace \n\n with actual line breaks
  return response.split('\n\n').map((line, index) => (
    <p key={index}>{line}</p>
  ));
};

const ChatPage = () => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false); // Loading state

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (query.trim() === '') return;

    setLoading(true); // Set loading to true when submitting the query

    try {
      const response = await axios.post('http://127.0.0.1:5000/search', { query });
      const llmResponse = response.data.llm_response;
      const newsArticles = response.data.news_articles || [];
      const youtubeVideos = response.data.youtube_videos || [];

      // Add query and responses to history
      setHistory([...history, { query, llmResponse, newsArticles, youtubeVideos }]);
      setQuery(''); // Clear input field
    } catch (error) {
      console.error('Error fetching response:', error);
    } finally {
      setLoading(false); // Set loading to false once response is received (or error)
    }
  };

  return (
    <div style={styles.container}>
      {/* Query History Sidebar */}
      <div style={styles.sidebar}>
        <h3 style={styles.title}>Query History</h3>
        <ul style={styles.historyList}>
          {history.map((item, index) => (
            <li key={index} style={styles.historyItem}>
              {truncateText(item.query, MAX_LENGTH)}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Chat Area */}
      <div style={styles.chatArea}>
        <div style={styles.chatBox}>
          {history.map((item, index) => (
            <div key={index} style={styles.chatItemContainer}>
              {/* Query (left) */}
              <div style={styles.query}>
                <strong>Query:</strong> {truncateText(item.query, MAX_LENGTH)}
              </div>

              {/* LLM Response (right) */}
              <div style={styles.response}>
                <strong>LLM Response:</strong>
                {formatLLMResponse(item.llmResponse)} {/* Render formatted response */}
                <div>
                  <strong>News Articles:</strong>
                  {item.newsArticles.map((article, idx) => (
                    <div key={idx} style={styles.article}>
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        {truncateText(article.title, MAX_LENGTH)}
                      </a>
                    </div>
                  ))}
                </div>
                <div>
                  <strong>YouTube Videos:</strong>
                  {item.youtubeVideos.map((video, idx) => (
                    <div key={idx} style={styles.video}>
                      <a href={video.url} target="_blank" rel="noopener noreferrer">
                        {truncateText(video.title, MAX_LENGTH)}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading message */}
        {loading && (
          <div style={styles.loadingMessage}>
            Fetching response...
          </div>
        )}

        {/* Input Section */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query..."
            style={styles.input}
            disabled={loading} // Disable input when loading
          />
          <button 
            type="submit" 
            style={styles.button} 
            disabled={loading} // Disable button when loading
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
  },
  sidebar: {
    width: '30%',
    backgroundColor: '#2c3e50',
    padding: '20px',
    borderRight: '1px solid #ddd',
    overflowY: 'auto',
  },
  title: {
    color: '#ecf0f1',
  },
  historyList: {
    listStyle: 'none',
    padding: 0,
  },
  historyItem: {
    padding: '10px',
    borderBottom: '1px solid #ddd',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#ecf0f1',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '20px',
    backgroundColor: '#AAAFBB',
  },
  chatBox: {
    marginBottom: '20px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  chatItemContainer: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column', // Display content vertically
    gap: '10px',
  },
  query: {
    backgroundColor: '#ffcccb',
    padding: '10px',
    borderRadius: '10px',
    fontWeight: 'bold',
    color: '#333',
  },
  response: {
    backgroundColor: '#3498db',
    padding: '10px',
    borderRadius: '10px',
    color: '#fff',
  },
  article: {
    marginTop: '5px',
  },
  video: {
    marginTop: '5px',
  },
  form: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '12px', // Increased padding for better look
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#333',
    transition: 'border-color 0.3s ease',
  },
  button: {
    padding: '12px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    transition: 'background-color 0.3s ease',
  },
  loadingMessage: {
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#e74c3c',
    margin: '20px 0',
  },
};

export default ChatPage;