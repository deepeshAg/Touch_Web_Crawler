import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API Keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")  # For web search
    SERP_API_KEY = os.getenv("SERP_API_KEY")     # Alternative search

    # App Settings
    APP_NAME = "Touch AI Research Assistant"
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # Security
    ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Content Moderation
    ENABLE_CONTENT_FILTER = True
    MAX_SEARCH_RESULTS = 10
    MAX_RESPONSE_LENGTH = 4000

settings = Settings()
