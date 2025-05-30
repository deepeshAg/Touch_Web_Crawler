from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage
from typing import List, Dict, Tuple
import json
import time
from datetime import datetime

from ..tools.web_search import WebSearchTool, WebScrapeTool
from ..models.schemas import Source, ResearchStep
from config import settings

class TouchResearchAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4-turbo-preview",
            temperature=0.1,
            api_key=settings.OPENAI_API_KEY
        )
        
        self.tools = [
            WebSearchTool(),
            WebScrapeTool()
        ]
        
        self.system_prompt = """You are Touch, an advanced AI research assistant. Your mission is to:

1. **Multi-Step Research**: Break complex queries into sub-questions and research each systematically
2. **Source Verification**: Use multiple sources and cross-reference information
3. **Synthesis**: Combine findings into coherent, well-structured answers
4. **Citation**: Always cite sources with URLs and brief descriptions
5. **Safety**: Filter out harmful, illegal, or inappropriate content

**Research Process:**
- Analyze the query and identify key research areas
- Perform targeted searches for each area
- Scrape detailed content from the most relevant sources
- Synthesize findings into a comprehensive answer
- Provide proper citations

**Safety Guidelines:**
- Refuse queries about illegal activities, harmful instructions, or dangerous content
- Filter out obviously malicious or inappropriate web content
- Focus on authoritative, credible sources
- If content seems suspicious, flag it and seek alternative sources

Always think step-by-step and explain your research process."""

    def _sanitize_input(self, query: str) -> Tuple[bool, str]:
        """Check if query is safe and appropriate"""
        dangerous_keywords = [
            "how to make", "bomb", "weapon", "hack", "illegal", "drug", "suicide"
        ]
        
        query_lower = query.lower()
        for keyword in dangerous_keywords:
            if keyword in query_lower:
                return False, f"I cannot help with queries related to: {keyword}"
        
        return True, query

    def _content_filter(self, content: str) -> str:
        """Filter and sanitize web content"""
        # Remove potential prompt injection attempts
        filtered_content = content.replace("Ignore previous instructions", "")
        filtered_content = filtered_content.replace("Ignore all previous", "")
        
        # Basic content moderation
        inappropriate_terms = ["hate speech", "violence", "explicit"]
        for term in inappropriate_terms:
            if term in filtered_content.lower():
                filtered_content = filtered_content.replace(term, "[FILTERED]")
        
        return filtered_content

    async def research_query(self, query: str) -> Dict:
        """Main research method"""
        start_time = time.time()
        
        # Safety check
        is_safe, safety_message = self._sanitize_input(query)
        if not is_safe:
            return {
                "answer": safety_message,
                "sources": [],
                "research_steps": [],
                "processing_time": time.time() - start_time,
                "confidence_score": 0.0
            }
        
        research_steps = []
        all_sources = []
        
        try:
            # Step 1: Analyze query and plan research
            step1 = ResearchStep(
                step_number=1,
                description="Analyzing query and planning research approach",
                timestamp=datetime.now()
            )
            research_steps.append(step1)
            
            # Step 2: Initial broad search
            search_tool = WebSearchTool()
            initial_results = search_tool._run(query)
            
            step2 = ResearchStep(
                step_number=2,
                description=f"Performed initial web search",
                search_query=query,
                sources_found=len(initial_results),
                timestamp=datetime.now()
            )
            research_steps.append(step2)
            
            # Step 3: Refine search with specific sub-queries
            refined_queries = self._generate_sub_queries(query)
            scrape_tool = WebScrapeTool()
            
            for i, sub_query in enumerate(refined_queries[:3]):  # Limit to 3 sub-queries
                sub_results = search_tool._run(sub_query)
                
                step = ResearchStep(
                    step_number=3 + i,
                    description=f"Researching: {sub_query}",
                    search_query=sub_query,
                    sources_found=len(sub_results),
                    timestamp=datetime.now()
                )
                research_steps.append(step)
                
                # Scrape top results for detailed content
                for result in sub_results[:2]:  # Top 2 results per sub-query
                    detailed_content = scrape_tool._run(result["url"])
                    result["detailed_content"] = self._content_filter(detailed_content)
                
                all_sources.extend(sub_results)
            
            # Step 4: Synthesize information
            synthesis_step = ResearchStep(
                step_number=len(research_steps) + 1,
                description="Synthesizing information and generating answer",
                timestamp=datetime.now()
            )
            research_steps.append(synthesis_step)
            
            # Generate comprehensive answer
            answer = await self._synthesize_answer(query, all_sources)
            
            # Prepare final sources
            final_sources = [
                Source(
                    title=src["title"],
                    url=src["url"],
                    snippet=src["snippet"],
                    relevance_score=src.get("relevance_score", 0.8)
                )
                for src in all_sources[:8]  # Top 8 sources
            ]
            
            return {
                "answer": answer,
                "sources": final_sources,
                "research_steps": research_steps,
                "processing_time": time.time() - start_time,
                "confidence_score": self._calculate_confidence(all_sources, answer)
            }
            
        except Exception as e:
            return {
                "answer": f"I encountered an error while researching your query: {str(e)}",
                "sources": [],
                "research_steps": research_steps,
                "processing_time": time.time() - start_time,
                "confidence_score": 0.0
            }

    def _generate_sub_queries(self, main_query: str) -> List[str]:
        """Generate focused sub-queries for deeper research"""
        prompt = f"""
        Given this main research query: "{main_query}"
        
        Generate 3 specific sub-questions that would help thoroughly research this topic.
        Focus on different aspects like current status, comparisons, implications, etc.
        
        Return only the questions, one per line.
        """
        
        try:
            response = self.llm.invoke([HumanMessage(content=prompt)])
            sub_queries = [q.strip() for q in response.content.split('\n') if q.strip()]
            return sub_queries[:3]
        except:
            return [main_query]  # Fallback to main query

    async def _synthesize_answer(self, query: str, sources: List[Dict]) -> str:
        """Synthesize research findings into a comprehensive answer"""
        
        # Prepare context from sources
        context = ""
        for i, source in enumerate(sources[:6]):  # Use top 6 sources
            context += f"\nSource {i+1} ({source['title']}):\n{source.get('detailed_content', source['snippet'])}\n"
        
        synthesis_prompt = f"""
        Research Query: {query}
        
        Based on the following research findings, provide a comprehensive, well-structured answer:
        
        {context}
        
        Requirements:
        1. Synthesize information from multiple sources
        2. Structure your answer with clear sections/points
        3. Include specific citations like "According to [Source Name]..."
        4. Highlight key findings and conclusions
        5. If sources conflict, acknowledge different perspectives
        6. Keep the answer informative but concise (max 800 words)
        
        Answer:"""
        
        try:
            response = self.llm.invoke([HumanMessage(content=synthesis_prompt)])
            return response.content
        except Exception as e:
            return f"Error synthesizing answer: {str(e)}"

    def _calculate_confidence(self, sources: List[Dict], answer: str) -> float:
        """Calculate confidence score based on sources and answer quality"""
        if not sources:
            return 0.0
        
        # Factors affecting confidence
        source_count = min(len(sources), 10) / 10  # Max score for 10+ sources
        avg_relevance = sum(s.get("relevance_score", 0.5) for s in sources) / len(sources)
        answer_length = min(len(answer.split()), 500) / 500  # Reasonable length
        
        confidence = (source_count * 0.4 + avg_relevance * 0.4 + answer_length * 0.2)
        return round(confidence, 2)