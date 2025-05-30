import requests
from typing import List, Dict
from langchain.tools import BaseTool
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
from config import settings
import os

class WebSearchTool(BaseTool):
    name: str = "web_search"  # Added type annotation
    description: str = "Search the web for current information on any topic"  # Added type annotation
    
    def _run(self, query: str) -> List[Dict]:
        """Execute web search using Tavily API or fallback to SerpAPI"""
        try:
            # Primary: Tavily Search (recommended for LangChain)
            if settings.TAVILY_API_KEY:
                return self._tavily_search(query)
            elif settings.SERP_API_KEY:
                return self._serp_search(query)
            else:
                raise Exception("No search API key configured")
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def _tavily_search(self, query: str) -> List[Dict]:
        """Search using Tavily API"""
        from tavily import TavilyClient
        
        print("Attempting Tavily search...")
        print(f"API Key length: {len(settings.TAVILY_API_KEY) if settings.TAVILY_API_KEY else 0}")
        
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        results = client.search(
            query=query,

        )
        
        print(results)
        return [
            {
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "snippet": result.get("content", ""),
                "relevance_score": result.get("score", 0)
            }
            for result in results.get("results", [])
        ]
    
    def _serp_search(self, query: str) -> List[Dict]:
        """Fallback search using SerpAPI"""
        url = "https://serpapi.com/search"
        params = {
            "api_key": settings.SERP_API_KEY,
            "engine": "google",
            "q": query,
            "num": settings.MAX_SEARCH_RESULTS
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        return [
            {
                "title": result.get("title", ""),
                "url": result.get("link", ""),
                "snippet": result.get("snippet", ""),
                "relevance_score": 1.0
            }
            for result in data.get("organic_results", [])
        ]

class WebScrapeTool(BaseTool):
    name: str = "web_scrape"  # Added type annotation
    description: str = "Extract detailed content from a specific webpage"  # Added type annotation
    
    def _run(self, url: str) -> str:
        """Scrape and clean content from a webpage"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove unwanted elements
            for element in soup(['script', 'style', 'nav', 'footer', 'header', 'ads']):
                element.decompose()
            
            # Extract main content
            content = soup.get_text()
            content = re.sub(r'\s+', ' ', content).strip()
            
            # Limit content length to prevent token overflow
            return content[:5000] if len(content) > 5000 else content
            
        except Exception as e:
            return f"Error scraping {url}: {str(e)}"