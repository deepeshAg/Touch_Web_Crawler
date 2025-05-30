'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, Globe, Loader, CheckCircle } from 'lucide-react';
import axios from 'axios';

interface Source {
  title: string;
  url: string;
  snippet: string;
  relevance_score?: number;
}

interface ResearchStep {
  step_number: number;
  description: string;
  search_query?: string;
  sources_found: number;
  timestamp: string;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  research_steps?: ResearchStep[];
  confidence_score?: number;
  processing_time?: number;
  timestamp: Date;
}

const API_BASE = 'http://localhost:8000';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentStep('Starting research...');

    try {
      const response = await axios.post(`${API_BASE}/api/research`, {
        query: input
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.answer,
        sources: response.data.sources,
        research_steps: response.data.research_steps,
        confidence_score: response.data.confidence_score,
        processing_time: response.data.processing_time,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while researching your query. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Touch</h1>
            <p className="text-sm text-gray-500">AI Research Assistant</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            <Globe className="w-4 h-4" />
            <span>Web-enabled</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome to Touch
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                I'm your AI research assistant. Ask me anything and I'll search the web, 
                analyze multiple sources, and provide you with comprehensive, cited answers.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {[
                  "Compare the latest electric vehicle models",
                  "What are the current trends in renewable energy?",
                  "Analyze the impact of AI on employment",
                  "Research sustainable fashion brands"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(example)}
                    className="p-4 text-left bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                  >
                    <p className="text-sm text-gray-700">{example}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-4xl ${message.type === 'user' ? 'ml-8' : 'mr-8'}`}>
                <div
                  className={`rounded-2xl px-6 py-4 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  
                  {message.confidence_score && (
                    <div className="mt-3 flex items-center gap-2 text-xs opacity-75">
                      <CheckCircle className="w-3 h-3" />
                      <span>Confidence: {Math.round(message.confidence_score * 100)}%</span>
                      <span>•</span>
                      <span>{message.processing_time?.toFixed(1)}s</span>
                    </div>
                  )}
                </div>

                {/* Research Steps */}
                {message.research_steps && message.research_steps.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 bg-blue-50 rounded-xl p-4"
                  >
                    <h4 className="text-sm font-medium text-blue-900 mb-3">Research Process</h4>
                    <div className="space-y-2">
                      {message.research_steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-medium text-blue-800">{step.step_number}</span>
                          </div>
                          <div>
                            <p className="text-sm text-blue-800">{step.description}</p>
                            {step.search_query && (
                              <p className="text-xs text-blue-600 mt-1">
                                Query: "{step.search_query}" ({step.sources_found} sources)
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 bg-gray-50 rounded-xl p-4"
                  >
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Sources ({message.sources.length})
                    </h4>
                    <div className="space-y-3">
                      {message.sources.map((source, i) => (
                        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 text-sm mb-1">
                                {source.title}
                              </h5>
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {source.snippet}
                              </p>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                {new URL(source.url).hostname}
                              </a>
                            </div>
                            {source.relevance_score && (
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {Math.round(source.relevance_score * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Loading State */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-4xl mr-8">
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Loader className="w-4 h-4 animate-spin text-indigo-500" />
                    <span className="text-sm text-gray-600">{currentStep}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white/80 backdrop-blur-md p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to research anything..."
                className="w-full resize-none border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                rows={1}
                style={{
                  minHeight: '48px',
                  maxHeight: '120px',
                  height: Math.min(120, Math.max(48, input.split('\n').length * 24))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl px-6 py-3 font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Research
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}