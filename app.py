import requests
from sentence_transformers import SentenceTransformer
import numpy as np
from flask import Flask, request, jsonify
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import JSONFormatter
import ollama  # Import the Ollama Python library
from flask_cors import CORS
# API Keys
YOUTUBE_API_KEY = "AIzaSyAd4fuJBVroZc_lnYv9XMc2e8N6ffx_pao"
NEWS_API_KEY = "3804a5079f344571916af04c13e2ddaa"
# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize Sentence-Transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

def generate_llama_response(prompt):
    """
    Generate a response using the Llama model via Ollama.
    """
    try:
        response = ollama.chat(model="llama3.2", messages=[{"role": "user", "content": prompt}])
        s = str(response)
        s = s[s.index("content=")+len("content="):].replace("\\n","")
        s = s.replace("\\","")
        return str(s)
    except Exception as e:
        print(f"Error generating response: {e}")
        return None

def fetch_news_articles(query, max_results=3):
    """
    Fetch the latest news articles based on the query using the Google News API.
    """
    news_url = f"https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "apiKey": NEWS_API_KEY,
        "pageSize": max_results,
    }
    response = requests.get(news_url, params=params)
    
    if response.status_code == 200:
        articles = response.json().get("articles", [])
        news_articles = []
        for article in articles:
            title = article["title"]
            description = article["description"]
            url = article["url"]
            news_articles.append({"title": title, "description": description, "url": url})
        return news_articles
    else:
        return []

def fetch_youtube_recommendations(query, max_results=3):
    """
    Fetch YouTube video recommendations based on the query.
    """
    youtube_search_url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "key": YOUTUBE_API_KEY,
    }
    response = requests.get(youtube_search_url, params=params)
    
    if response.status_code == 200:
        videos = response.json().get("items", [])
        recommendations = []
        for video in videos:
            video_id = video["id"]["videoId"]
            title = video["snippet"]["title"]
            url = f"https://www.youtube.com/watch?v={video_id}"
            recommendations.append({"title": title, "url": url, "video_id": video_id})
        return recommendations
    else:
        return []

def fetch_youtube_transcript(video_id):
    """
    Fetch the transcript of a YouTube video using its video ID.
    """
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        # Combine transcript into a single string
        combined_transcript = " ".join([entry["text"] for entry in transcript])
        return combined_transcript
    except Exception as e:
        print(f"Error fetching transcript for video ID {video_id}: {e}")
        return None

def compute_relevance_score(query, text):
    """
    Compute relevance score between query and a given text using Sentence-Transformers.
    """
    query_embedding = model.encode([query])
    text_embedding = model.encode([text])
    cosine_sim = np.dot(query_embedding, text_embedding.T) / (np.linalg.norm(query_embedding) * np.linalg.norm(text_embedding))
    return float(cosine_sim[0][0])

def fact_check_youtube_videos(news_articles, youtube_videos):
    """
    Fact-check YouTube videos by comparing their transcripts with the latest news articles.
    Rank the videos based on relevance.
    """
    if not news_articles or not youtube_videos:
        return []

    ranked_videos = []
    
    for video in youtube_videos:
        video_transcript = fetch_youtube_transcript(video["video_id"])
        
        if not video_transcript:
            continue
        
        # Combine all news articles into one string for comparison
        news_text = " ".join([article["title"] + " " + (article["description"] or "") for article in news_articles])
        
        # Compute the relevance score between the news articles and the video transcript
        relevance_score = compute_relevance_score(news_text, video_transcript)
        ranked_videos.append({"title": video["title"], "url": video["url"], "score": float(relevance_score)})

    # Sort videos by relevance score
    ranked_videos = sorted(ranked_videos, key=lambda x: x["score"], reverse=True)
    return ranked_videos

@app.route("/search", methods=["POST"])
def search():
    # Parse the JSON payload from the request body
    data = request.get_json()
    
    if not data or "query" not in data:
        return jsonify({"error": "JSON body is missing or 'query' field is missing"}), 400
    
    user_query = str(data["query"])

    # Fetch Google News Articles
    news_articles = fetch_news_articles(user_query)
    if not news_articles:
        news_response = {"message": "No relevant news articles found."}
    else:
        news_response = [{"title": article["title"], "description": article["description"][:150], "url": article["url"]} for article in news_articles]

    # Fetch YouTube Recommendations
    youtube_videos = fetch_youtube_recommendations(user_query)
    if not youtube_videos:
        youtube_response = {"message": "No YouTube videos found."}
    else:
        youtube_response = [{"title": video["title"], "url": video["url"]} for video in youtube_videos]

    # Fact-check YouTube Videos based on News Articles
    ranked_videos = fact_check_youtube_videos(news_articles, youtube_videos)
    ranked_response = [{"title": video["title"], "url": video["url"], "score": video["score"]} for video in ranked_videos]

    # Generate LLM response based on fact-checked YouTube videos and news articles
    input_text = f"""
    User Query: {user_query}
    
    News Articles:
    {', '.join([article['title'] for article in news_articles])}
    
    YouTube Videos:
    {', '.join([video['title'] for video in ranked_videos])}
    """
    
    llm_response = generate_llama_response(input_text)
    
    response_data = {
        "news_articles": news_response,
        "youtube_videos": youtube_response,
        "ranked_videos": ranked_response,
        "llm_response": llm_response,
    }

    return jsonify(response_data)


if __name__ == "__main__":
    # Run the Flask app
    app.run(debug=True, host="0.0.0.0", port=5000)
