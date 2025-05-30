from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
import uuid
import time
from datetime import datetime
from typing import AsyncGenerator
import asyncio

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

# Store active conversations
conversations = {}

class StreamingResearchService:
    def __init__(self):
        try:
            self.research_agent = TouchResearchAgent()
            print("✅ Research agent initialized")
        except Exception as e:
            print(f"❌ Agent init error: {e}")
            self.research_agent = None

    def _format_sse_data(self, event_type: str, data: dict) -> str:
        """Format data for Server-Sent Events"""
        try:
            json_data = json.dumps({'type': event_type, 'data': data}, ensure_ascii=False)
            formatted = f"data: {json_data}\n\n"
            print(f"SSE: {event_type} - {str(data)[:100]}...")  # Debug log
            return formatted
        except Exception as e:
            print(f"JSON serialization error: {e}")  # Debug log
            # Fallback if JSON serialization fails
            fallback = f"data: {json.dumps({'type': 'error', 'data': {'message': f'Serialization error: {str(e)}'}})}\n\n"
            return fallback
    
    async def research_query_stream(self, query: str) -> AsyncGenerator[str, None]:
        """Fixed streaming with proper event flow"""
        
        if not self.research_agent:
            yield self._format_sse_data("error", {"message": "Agent not initialized"})
            return
            
        try:
            print(f"🔍 Starting research: {query}")
            queue = asyncio.Queue()

            async def on_step(data: dict):
                await queue.put(self._format_sse_data("research_step", data))

            research_task = asyncio.create_task(
                self.research_agent.research_query(query, on_step=on_step)
            )

            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield item
                    queue.task_done()
                except asyncio.TimeoutError:
                    break  
            
            # Step 2: Execute actual research
            print("🤖 Executing research agent...")
            result = await self.research_agent.research_query(query, on_step=on_step)
            print(f"✅ Research completed: {len(result.get('answer', ''))} chars")
            
            # Step 3: Send sources (this triggers frontend to show sources)
            sources = result.get("sources", [])
            if sources:
                print(f"📚 Sending {len(sources)} sources")
                # Format sources for JSON serialization
                clean_sources = []
                for source in sources:
                    clean_source = {
                        "title": str(source.get("title", "")),
                        "url": str(source.get("url", "")), 
                        "snippet": str(source.get("snippet", "")),
                        "relevance_score": float(source.get("relevance_score", 0.8))
                    }
                    clean_sources.append(clean_source)
                
                yield self._format_sse_data("sources", {"sources": clean_sources})
                await asyncio.sleep(0.5)
            
            # Step 4: Signal content start (this is what frontend waits for)
            yield self._format_sse_data("start_synthesis", {})
            await asyncio.sleep(0.3)
            
            # Step 5: Stream content
            answer = result.get("answer", "")
            if answer:
                print(f"📝 Streaming {len(answer)} chars")
                lines = answer.splitlines()
                for line in lines:
                    if line.strip():  # ignore empty lines if needed
                        yield self._format_sse_data("content_chunk", {"chunk": line + "\n"})
                        await asyncio.sleep(0.1)
            else:
                print("⚠️ No answer content")
                yield self._format_sse_data("content_chunk", {"chunk": "No content was generated."})
            
            # Step 6: Complete
            yield self._format_sse_data("complete", {
                "confidence_score": result.get("confidence_score", 0.8),
                "processing_time": result.get("processing_time", 1.0)
            })
            print("✅ Stream completed")
            
        except Exception as e:
            print(f"❌ Stream error: {e}")
            import traceback
            traceback.print_exc()
            yield self._format_sse_data("error", {"message": f"Research error: {str(e)}"})
    


# Initialize streaming service
streaming_service = StreamingResearchService()

@app.get("/")
async def root():
    return {"message": "Touch AI Research Assistant API", "version": "1.0.0"}

@app.post("/api/research", response_model=QueryResponse)
async def research_query(request: QueryRequest):
    """Main research endpoint using LangChain agent"""
    try:
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        # Use your TouchResearchAgent (which now uses LangChain properly)
        research_agent = TouchResearchAgent()
        result = await research_agent.research_query(request.query)
        print(f"Non-streaming result: {result}")  # Debug log
        
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
        import traceback
        print(f"Non-streaming error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="Research Failed",
                message=str(e),
                code=500
            ).dict()
        )

@app.get("/api/research/stream")
async def stream_research(query: str):
    """Fixed streaming endpoint"""
    
    print(f"Stream request: {query}")
    
    if not query or len(query.strip()) < 3:
        async def error_stream():
            yield "data: {\"type\": \"error\", \"data\": {\"message\": \"Query too short\"}}\n\n"
        
        return StreamingResponse(error_stream(), media_type="text/event-stream")
    
    async def safe_generate():
        try:
            # Send connection confirmation
            yield "data: {\"type\": \"connected\", \"data\": {\"message\": \"Stream connected\"}}\n\n"
            await asyncio.sleep(0.1)
            
            async for data in streaming_service.research_query_stream(query):
                yield data
                
        except Exception as e:
            print(f"Stream error: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {{\"type\": \"error\", \"data\": {{\"message\": \"Error: {str(e)}\"}}}}\n\n"
    
    return StreamingResponse(
        safe_generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


# Add a simple test endpoint
@app.get("/api/test/stream")
async def test_stream():
    """Test streaming endpoint"""
    async def simple_stream():
        print("Test stream starting...")
        for i in range(5):
            message = f"Test message {i+1}"
            data = f"data: {json.dumps({'type': 'test', 'data': {'message': message}})}\n\n"
            print(f"Sending: {message}")
            yield data
            await asyncio.sleep(1)
        print("Test stream completed")
    
    return StreamingResponse(
        simple_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
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