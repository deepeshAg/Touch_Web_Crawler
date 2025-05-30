from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
import uuid
from datetime import datetime

from app.agents.research_agent import TouchResearchAgent
from app.models.schemas import QueryRequest, QueryResponse, ErrorResponse
from config import settings

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the research agent
research_agent = TouchResearchAgent()

# Store active conversations
conversations = {}

@app.get("/")
async def root():
    return {"message": "Touch AI Research Assistant API", "version": "1.0.0"}

@app.post("/api/research", response_model=QueryResponse)
async def research_query(request: QueryRequest):
    """Main research endpoint"""
    try:
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        # Perform research
        result = await research_agent.research_query(request.query)
        
        # Store conversation
        conversations[conversation_id] = {
            "query": request.query,
            "response": result,
            "timestamp": datetime.now()
        }
        
        response = QueryResponse(
            answer=result["answer"],
            sources=result["sources"],
            research_steps=result["research_steps"],
            conversation_id=conversation_id,
            processing_time=result["processing_time"],
            confidence_score=result["confidence_score"]
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="Research Failed",
                message=str(e),
                code=500
            ).dict()
        )

@app.get("/api/research/stream/{conversation_id}")
async def stream_research(conversation_id: str, query: str):
    """Streaming research endpoint for real-time updates"""
    
    async def generate_stream():
        try:
            # Send initial message
            yield f"data: {json.dumps({'type': 'start', 'message': 'Starting research...'})}\n\n"
            
            # This would be enhanced to provide real-time updates
            # For now, we'll simulate the process
            steps = [
                "Analyzing your query...",
                "Searching the web...",
                "Gathering detailed information...",
                "Synthesizing findings...",
                "Finalizing answer..."
            ]
            
            for i, step in enumerate(steps):
                await asyncio.sleep(1)  # Simulate processing time
                yield f"data: {json.dumps({'type': 'step', 'step': i+1, 'message': step})}\n\n"
            
            # Perform actual research
            result = await research_agent.research_query(query)
            
            # Send final result
            yield f"data: {json.dumps({'type': 'complete', 'result': result})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Retrieve a specific conversation"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversations[conversation_id]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=settings.DEBUG)