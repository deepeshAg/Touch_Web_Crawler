from typing import List, Dict
import re


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