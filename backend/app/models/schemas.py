from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    conversation_id: Optional[str] = None

class Source(BaseModel):
    title: str
    url: str
    snippet: str
    relevance_score: Optional[float] = None

class ResearchStep(BaseModel):
    step_number: int
    description: str
    search_query: Optional[str] = None
    sources_found: int = 0
    timestamp: datetime

class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]
    research_steps: List[ResearchStep]
    conversation_id: str
    processing_time: float
    confidence_score: Optional[float] = None

class ErrorResponse(BaseModel):
    error: str
    message: str
    code: int