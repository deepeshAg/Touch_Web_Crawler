from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage
from typing import List, Dict, Tuple, Literal
import json
import time
import re
from datetime import datetime
from ..prompts.prompts import research_prompt, simple_query_prompt,get_classification_prompt,get_safety_prompt

from ..tools.web_search import WebSearchTool, WebScrapeTool
from config import settings

class TouchResearchAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.1,
            api_key=settings.OPENAI_API_KEY
        )
        
        self.classifier_llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.0,  
            api_key=settings.OPENAI_API_KEY
        )
        
        self.tools = [
            WebSearchTool(),
            WebScrapeTool()
        ]
        
        # Create different agents for different query types
        self.research_agent = self._create_research_agent()
        self.simple_agent = self._create_simple_agent()

    def _create_research_agent(self):
        """Create agent for complex research queries"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", research_prompt()),
            ("user", "{input}"),
            ("assistant", "{agent_scratchpad}")
        ])
        
        agent = create_openai_tools_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt
        )
        
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            max_iterations=15,
            max_execution_time=60,
            handle_parsing_errors=True,
            return_intermediate_steps=True,
            early_stopping_method="generate"
        )

    def _create_simple_agent(self):
        """Create agent for simple/real-time queries"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", simple_query_prompt()),
            ("user", "{input}"),
            ("assistant", "{agent_scratchpad}")
        ])
        
        agent = create_openai_tools_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt
        )
        
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            max_iterations=5,
            max_execution_time=30,
            handle_parsing_errors=True,
            return_intermediate_steps=True,
            early_stopping_method="generate"
        )



    async def _classify_query_with_llm(self, query: str) -> Dict[str, any]:
        """Use LLM to classify query as simple or complex"""
        try:
            prompt = get_classification_prompt().format(query=query)
            
            messages = [HumanMessage(content=prompt)]
            response = self.classifier_llm.invoke(messages)
            
            # Parse the JSON response
            response_text = response.content.strip()
            
            # Extract JSON from response if it's wrapped in markdown
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()
            
            classification_result = json.loads(response_text)
            
            # Validate the response
            if "classification" not in classification_result:
                raise ValueError("Missing classification field")
            
            if classification_result["classification"] not in ["simple", "complex"]:
                raise ValueError("Invalid classification value")
            
            # Set defaults for missing fields
            classification_result.setdefault("reasoning", "No reasoning provided")
            classification_result.setdefault("confidence", 0.7)
            
            return classification_result
            
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            print(f"⚠️ LLM classification error: {e}")
            # Fallback to simple heuristic
            return self._fallback_classification(query)
        except Exception as e:
            print(f"⚠️ Unexpected classification error: {e}")
            return self._fallback_classification(query)



    async def _sanitize_input(self, query: str) -> Tuple[bool, str]:
        """Use LLM to check if query is safe and appropriate"""
        try:
            prompt = get_safety_prompt().format(query=query)
            
            messages = [HumanMessage(content=prompt)]
            response = self.safety_llm.invoke(messages)
            
            # Parse the JSON response
            response_text = response.content.strip()
            
            # Extract JSON from response if it's wrapped in markdown
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()
            
            safety_result = json.loads(response_text)
            
            # Validate the response
            if "is_safe" not in safety_result:
                raise ValueError("Missing is_safe field")
            
            if not isinstance(safety_result["is_safe"], bool):
                raise ValueError("Invalid is_safe value - must be boolean")
            
            # Set defaults for missing fields
            safety_result.setdefault("reason", "No reason provided")
            safety_result.setdefault("confidence", 0.7)
            
            is_safe = safety_result["is_safe"]
            reason = safety_result.get("reason", "Query flagged as potentially unsafe")
            
            if is_safe:
                return True, query
            else:
                return False, f"I cannot help with this query. {reason}"
                
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            print(f"⚠️ LLM safety check error: {e}")
            # Fallback to keyword-based safety check
            return self._fallback_safety_check(query)
        except Exception as e:
            print(f"⚠️ Unexpected safety check error: {e}")
            return self._fallback_safety_check(query)

    async def research_query(self, query: str) -> Dict:
        """Main research method with LLM-based agent selection"""
        start_time = time.time()
        
        # Safety check
        is_safe, safety_message = self._sanitize_input(query)
        if not is_safe:
            return {
                "answer": safety_message,
                "sources": [],
                "research_steps": [],
                "processing_time": time.time() - start_time,
                "confidence_score": 0.0,
                "query_classification": "blocked"
            }
        
        try:
            # Use LLM to classify query
            classification_result = await self._classify_query_with_llm(query)
            query_type = classification_result["classification"]
            
            print(f"🤖 LLM classified query as '{query_type}' (confidence: {classification_result['confidence']:.2f})")
            print(f"📝 Reasoning: {classification_result['reasoning']}")
            
            
            # Choose appropriate agent based on classification
            agent_executor = self.simple_agent if query_type == "simple" else self.research_agent
            
            # For real-time queries, enhance with temporal context
            if query_type == "simple":
                query = self._enhance_realtime_query(query)
            
            # Execute the agent
            result = agent_executor.invoke({"input": query})
            print(f"✅ Agent execution completed")
            
            # Check if agent stopped due to max iterations
            answer = result.get("output", "")
            if "Agent stopped due to max iterations" in answer:
                print("⚠️ Agent hit max iterations, attempting recovery...")
                answer = self._recover_from_max_iterations(result, query_type)
            
            # Extract intermediate steps and sources
            intermediate_steps = result.get("intermediate_steps", [])
            research_steps = self._convert_steps_to_research_steps(intermediate_steps)
            sources = self._extract_sources_from_steps(intermediate_steps)
            
            # Format the answer
            formatted_answer = self._ensure_markdown_formatting(answer, sources)
            
            return {
                "answer": formatted_answer,
                "sources": sources,
                "research_steps": research_steps,
                "processing_time": time.time() - start_time,
                "confidence_score": self._calculate_confidence(sources, formatted_answer),
                "query_classification": {
                    "type": query_type,
                    "reasoning": classification_result["reasoning"],
                    "confidence": classification_result["confidence"]
                }
            }
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"❌ Agent execution error: {error_detail}")
            
            return {
                "answer": f"I encountered an error while researching your query: {str(e)}",
                "sources": [],
                "research_steps": [],
                "processing_time": time.time() - start_time,
                "confidence_score": 0.0,
                "query_classification": "error"
            }

    def _enhance_realtime_query(self, query: str) -> str:
        """Enhance real-time queries with current date context"""
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        # Add date context for time-sensitive queries
        if any(word in query.lower() for word in ["today", "latest", "current", "now"]):
            query = f"{query} {current_date}"
        
        return query

    # ... (rest of the methods remain the same as in your original code)
    def _recover_from_max_iterations(self, result: Dict, query_type: str) -> str:
        """Attempt to recover useful information when max iterations is hit"""
        try:
            intermediate_steps = result.get("intermediate_steps", [])
            
            if not intermediate_steps:
                return "I couldn't find sufficient information to answer your query completely. Please try rephrasing your question."
            
            # Extract information from the steps we did complete
            partial_info = []
            for step_tuple in intermediate_steps:
                if len(step_tuple) >= 2:
                    action, observation = step_tuple[0], step_tuple[1]
                    
                    if isinstance(observation, str) and len(observation) > 50:
                        partial_info.append(observation[:200])
                    elif isinstance(observation, (list, tuple)) and len(observation) > 0:
                        # Extract useful info from search results
                        for item in observation[:3]:
                            if isinstance(item, dict) and "snippet" in item:
                                partial_info.append(item["snippet"][:150])
            
            if partial_info:
                combined_info = " ".join(partial_info)
                return f"# Partial Research Results\n\nBased on my initial research, here's what I found:\n\n{combined_info}\n\n*Note: This is a partial response. For more complete information, please try rephrasing your query or breaking it into smaller questions.*"
            else:
                return "I wasn't able to gather enough information to answer your query. Please try rephrasing your question or making it more specific."
                
        except Exception as e:
            print(f"Error in recovery: {e}")
            return "I encountered an issue while researching your query. Please try rephrasing your question."

    def _convert_steps_to_research_steps(self, intermediate_steps: List) -> List[Dict]:
        """Convert LangChain intermediate steps to research steps format"""
        research_steps = []
        
        try:
            for i, step_tuple in enumerate(intermediate_steps):
                if len(step_tuple) >= 2:
                    action, observation = step_tuple[0], step_tuple[1]
                    
                    # Safely get tool input
                    tool_input = ""
                    if hasattr(action, 'tool_input'):
                        if isinstance(action.tool_input, dict):
                            tool_input = str(action.tool_input.get('query', action.tool_input))[:100]
                        else:
                            tool_input = str(action.tool_input)[:100]
                    
                    # Safely get tool name
                    tool_name = ""
                    if hasattr(action, 'tool'):
                        tool_name = str(action.tool)
                    
                    # Count sources found
                    sources_found = 0
                    if isinstance(observation, (list, tuple)):
                        sources_found = len(observation)
                    elif isinstance(observation, str) and observation:
                        sources_found = 1
                    
                    step = {
                        "step_number": i + 1,
                        "description": f"Used {tool_name}: {tool_input}{'...' if len(tool_input) >= 100 else ''}",
                        "search_query": tool_input if tool_name == "web_search" else None,
                        "sources_found": sources_found,
                        "timestamp": datetime.now().isoformat()
                    }
                    research_steps.append(step)
                    
        except Exception as e:
            print(f"Error converting steps: {e}")
            research_steps = [{
                "step_number": 1,
                "description": "Research completed",
                "sources_found": 0,
                "timestamp": datetime.now().isoformat()
            }]
        
        return research_steps

    def _extract_sources_from_steps(self, intermediate_steps: List) -> List[Dict]:
        """Extract sources from intermediate steps"""
        sources = []
        
        try:
            for step_tuple in intermediate_steps:
                if len(step_tuple) >= 2:
                    action, observation = step_tuple[0], step_tuple[1]
                    
                    # Check if this was a web_search action
                    tool_name = ""
                    if hasattr(action, 'tool'):
                        tool_name = str(action.tool)
                    
                    if tool_name == "web_search" and isinstance(observation, (list, tuple)):
                        items_to_process = list(observation)[:5]
                        
                        for item in items_to_process:
                            if isinstance(item, dict):
                                title = item.get("title", "")
                                url = item.get("url", "")
                                snippet = item.get("snippet", "")
                                
                                if title and url:
                                    source = {
                                        "title": str(title),
                                        "url": str(url),
                                        "snippet": str(snippet),
                                        "relevance_score": float(item.get("relevance_score", 0.8))
                                    }
                                    sources.append(source)
        
        except Exception as e:
            print(f"Error extracting sources: {e}")
            sources = []
        
        # Remove duplicates based on URL
        try:
            seen_urls = set()
            unique_sources = []
            for source in sources:
                url = source.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    unique_sources.append(source)
            
            return unique_sources[:8]
            
        except Exception as e:
            print(f"Error deduplicating sources: {e}")
            return sources[:8]

    def _ensure_markdown_formatting(self, answer: str, sources: List[Dict]) -> str:
        """Ensure proper markdown formatting"""
        try:
            if not answer or not isinstance(answer, str):
                answer = "No answer was generated."
            
            # Remove the "Agent stopped" message if present
            if "Agent stopped due to max iterations" in answer:
                answer = answer.replace("Agent stopped due to max iterations.", "").strip()
                if not answer:
                    answer = "Research completed with available information."
            
            # Add header if missing
            if not answer.strip().startswith('#'):
                lines = answer.strip().split('\n')
                if lines:
                    first_line = lines[0].strip()
                    if len(first_line) < 100 and not first_line.endswith(':'):
                        answer = f"# {first_line}\n\n" + '\n'.join(lines[1:])
                    else:
                        answer = f"# Research Results\n\n{answer}"
            
            # Ensure proper spacing
            answer = re.sub(r'([^\n])\n(#{1,6}\s)', r'\1\n\n\2', answer)
            answer = re.sub(r'(#{1,6}.*)\n([^\n#])', r'\1\n\n\2', answer)
            
            # Add sources if available and not already present
            if "## Sources" not in answer and "## References" not in answer and sources:
                sources_section = self._generate_sources_markdown(sources)
                answer += f"\n\n{sources_section}"
            
            # Clean up excessive blank lines
            answer = re.sub(r'\n{3,}', '\n\n', answer)
            
            return answer.strip()
            
        except Exception as e:
            print(f"Error formatting markdown: {e}")
            return f"# Research Results\n\n{answer}\n\nNote: There was an error formatting this response."

    def _generate_sources_markdown(self, sources: List[Dict]) -> str:
        """Generate markdown sources section"""
        try:
            if not sources:
                return ""
            
            sources_md = "## Sources\n\n"
            
            for i, source in enumerate(sources, 1):
                title = source.get('title', 'Unknown Title')
                url = source.get('url', '#')
                snippet = source.get('snippet', '')
                
                if len(snippet) > 150:
                    snippet = snippet[:147] + "..."
                
                sources_md += f"{i}. **[{title}]({url})**\n"
                if snippet:
                    sources_md += f"   *{snippet}*\n\n"
                else:
                    sources_md += "\n"
            
            return sources_md
            
        except Exception as e:
            print(f"Error generating sources markdown: {e}")
            return "## Sources\n\nError generating sources list.\n"

    def _calculate_confidence(self, sources: List[Dict], answer: str) -> float:
        """Calculate confidence score"""
        try:
            if not sources:
                return 0.0
            
            source_count = min(len(sources), 8) / 8
            avg_relevance = sum(s.get("relevance_score", 0.5) for s in sources) / len(sources)
            answer_length = min(len(str(answer).split()), 500) / 500
            
            confidence = (source_count * 0.4 + avg_relevance * 0.4 + answer_length * 0.2)
            return round(confidence, 2)
            
        except Exception as e:
            print(f"Error calculating confidence: {e}")
            return 0.5