from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain.schema import HumanMessage
import asyncio
import json
import uuid
import time
import re
from datetime import datetime
from typing import AsyncGenerator

from app.agents.research_agent import TouchResearchAgent
from app.models.schemas import QueryRequest, QueryResponse, ErrorResponse
from app.tools.web_search import WebSearchTool, WebScrapeTool
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

class StreamingResearchAgent(TouchResearchAgent):
    """Extended research agent with streaming capabilities"""
    
    async def research_query_stream(self, query: str) -> AsyncGenerator[str, None]:
        """Stream research results in real-time with proper flow"""
        start_time = time.time()
        
        # Safety check
        is_safe, safety_message = self._sanitize_input(query)
        if not is_safe:
            yield self._format_sse_data("error", {"message": safety_message})
            return
        
        research_steps = []
        all_sources = []
        
        try:
            # Step 1: Analyze query and plan research
            step1_data = {
                "step_number": 1,
                "description": "Analyzing query and planning research approach",
                "timestamp": datetime.now().isoformat(),
                "sources_found": 0
            }
            research_steps.append(step1_data)
            yield self._format_sse_data("research_step", step1_data)
            await asyncio.sleep(0.8)  # Allow time for UI to show step
            
            # Step 2: Initial broad search
            search_tool = WebSearchTool()
            
            step2_start = {
                "step_number": 2,
                "description": "Performing initial web search...",
                "search_query": query,
                "timestamp": datetime.now().isoformat(),
                "sources_found": 0
            }
            yield self._format_sse_data("research_step", step2_start)
            
            # Actually perform the search
            initial_results = search_tool._run(query)
            
            step2_data = {
                "step_number": 2,
                "description": "Completed initial web search",
                "search_query": query,
                "sources_found": len(initial_results),
                "timestamp": datetime.now().isoformat()
            }
            research_steps.append(step2_data)
            yield self._format_sse_data("research_step", step2_data)
            await asyncio.sleep(0.5)
            
            # Step 3: Generate sub-queries
            step3_start = {
                "step_number": 3,
                "description": "Generating focused research queries...",
                "timestamp": datetime.now().isoformat(),
                "sources_found": 0
            }
            yield self._format_sse_data("research_step", step3_start)
            
            refined_queries = self._generate_sub_queries(query)
            scrape_tool = WebScrapeTool()
            
            # Step 4-6: Research sub-queries
            for i, sub_query in enumerate(refined_queries[:3]):
                step_num = 4 + i
                
                # Start step
                step_start = {
                    "step_number": step_num,
                    "description": f"Researching: {sub_query[:60]}{'...' if len(sub_query) > 60 else ''}",
                    "search_query": sub_query,
                    "timestamp": datetime.now().isoformat(),
                    "sources_found": 0
                }
                yield self._format_sse_data("research_step", step_start)
                
                # Perform search
                sub_results = search_tool._run(sub_query)
                
                # Complete step
                step_data = {
                    "step_number": step_num,
                    "description": f"Found {len(sub_results)} sources for: {sub_query[:50]}{'...' if len(sub_query) > 50 else ''}",
                    "search_query": sub_query,
                    "sources_found": len(sub_results),
                    "timestamp": datetime.now().isoformat()
                }
                research_steps.append(step_data)
                yield self._format_sse_data("research_step", step_data)
                
                # Scrape top results
                for result in sub_results[:2]:
                    if result.get("url") and "example.com" not in result["url"]:
                        detailed_content = scrape_tool._run(result["url"])
                        result["detailed_content"] = self._content_filter(detailed_content)
                
                all_sources.extend(sub_results)
                await asyncio.sleep(0.6)  # Delay between sub-queries
            
            # Step 7: Prepare sources
            final_sources = []
            for src in all_sources[:8]:
                if src.get("title") and src.get("url"):
                    final_sources.append({
                        "title": src["title"],
                        "url": src["url"],
                        "snippet": src.get("snippet", ""),
                        "relevance_score": src.get("relevance_score", 0.8)
                    })
            
            # Send sources BEFORE starting synthesis
            if final_sources:
                yield self._format_sse_data("sources", {"sources": final_sources})
                await asyncio.sleep(0.5)
            
            # Step 8: Synthesis preparation
            synthesis_step = {
                "step_number": len(research_steps) + 1,
                "description": "Synthesizing information and generating comprehensive answer",
                "timestamp": datetime.now().isoformat(),
                "sources_found": len(final_sources)
            }
            research_steps.append(synthesis_step)
            yield self._format_sse_data("research_step", synthesis_step)
            await asyncio.sleep(0.8)
            
            # Signal start of synthesis - this tells frontend to show content area
            yield self._format_sse_data("start_synthesis", {})
            
            # Stream the answer generation
            async for chunk in self._synthesize_answer_stream(query, all_sources):
                yield self._format_sse_data("content_chunk", {"chunk": chunk})
                await asyncio.sleep(0.04)  # Smooth streaming delay
            
            # Final completion
            processing_time = time.time() - start_time
            confidence_score = self._calculate_confidence(all_sources, "")
            
            yield self._format_sse_data("complete", {
                "confidence_score": confidence_score,
                "processing_time": processing_time
            })
            
        except Exception as e:
            yield self._format_sse_data("error", {"message": f"Research error: {str(e)}"})
    
    def _format_sse_data(self, event_type: str, data: dict) -> str:
        """Format data for Server-Sent Events"""
        return f"data: {json.dumps({'type': event_type, 'data': data})}\n\n"
    
    async def _synthesize_answer_stream(self, query: str, sources: list) -> AsyncGenerator[str, None]:
        """Stream the answer synthesis process with clean markdown"""
        # Prepare context from sources
        context = ""
        for i, source in enumerate(sources[:6]):
            context += f"\nSource {i+1} ({source.get('title', 'Unknown')}):\n{source.get('detailed_content', source.get('snippet', ''))}\n"
        
        synthesis_prompt = f"""
        Research Query: {query}
        
        Based on the following research findings, provide a comprehensive, well-structured answer in markdown format:
        
        {context}
        
        Requirements:
        1. Use proper markdown formatting with headers (###), bold (**text**), and sections
        2. Structure your answer with clear sections and subsections
        3. Include specific citations like "According to [Source Name]..."
        4. Highlight key findings and conclusions
        5. If sources conflict, acknowledge different perspectives
        6. Keep the answer informative but well-organized (aim for 600-1000 words)
        7. Use bullet points or numbered lists where appropriate
        8. Start with a brief introduction and end with a conclusion
        
        Format your response in clean markdown. Don't include markdown code blocks or extra formatting.
        
        Answer:"""
        
        try:
            # Generate the full response first
            response = self.llm.invoke([HumanMessage(content=synthesis_prompt)])
            answer = response.content
            
            # Stream by words for smooth effect
            words = answer.split()
            chunk_size = 3  # Send 3 words at a time for smooth streaming
            
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i:i + chunk_size])
                if i + chunk_size < len(words):
                    chunk += " "
                yield chunk
                
        except Exception as e:
            yield f"Error generating answer: {str(e)}"
        

# Initialize streaming agent
streaming_agent = StreamingResearchAgent()

@app.get("/")
async def root():
    return {"message": "Touch AI Research Assistant API", "version": "1.0.0"}

@app.post("/api/research", response_model=QueryResponse)
async def research_query(request: QueryRequest):
    """Main research endpoint (non-streaming)"""
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

@app.get("/api/research/stream")
async def stream_research(query: str):
    """Enhanced streaming research endpoint with real-time updates"""
    
    async def generate():
        async for data in streaming_agent.research_query_stream(query):
            yield data
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Keep your old streaming endpoint as backup
@app.get("/api/research/stream/{conversation_id}")
async def stream_research_legacy(conversation_id: str, query: str):
    """Legacy streaming research endpoint"""
    
    async def generate_stream():
        try:
            # Send initial message
            yield f"data: {json.dumps({'type': 'start', 'message': 'Starting research...'})}\n\n"
            
            steps = [
                "Analyzing your query...",
                "Searching the web...",
                "Gathering detailed information...",
                "Synthesizing findings...",
                "Finalizing answer..."
            ]
            
            for i, step in enumerate(steps):
                await asyncio.sleep(1)
                yield f"data: {json.dumps({'type': 'step', 'step': i+1, 'message': step})}\n\n"
            
            # Perform actual research
            result = await research_agent.research_query(query)
            
            # Send final result
            yield f"data: {json.dumps({'type': 'complete', 'result': result})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
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