'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Loader } from 'lucide-react';
import Markdown from 'react-markdown';

// Import components (in a real project, these would be separate files)
import Header from './Header';
import ResearchSteps from './ResearchSteps';
import Sources from './Sources';
import MessageContent from './Content';
import InputSection from './InputSection';

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
  isStreaming?: boolean;
  showSteps?: boolean;
  showSources?: boolean;
  showContent?: boolean;
  researchComplete?: boolean;
}

interface StreamEvent {
  type: 'research_step' | 'content_chunk' | 'sources' | 'complete' | 'error' | 'start_synthesis';
  data: any;
}

const API_BASE = 'http://localhost:8000';

// Welcome Component
function WelcomeScreen({ onExampleClick }: { onExampleClick: (text: string) => void }) {
  const examples = [
    {
      title: "AI & Technology",
      query: "Compare the latest AI models and their capabilities",
      icon: "🤖"
    },
    {
      title: "Science & Research",
      query: "Latest breakthroughs in quantum computing",
      icon: "🔬"
    },
    {
      title: "Business & Markets",
      query: "Analyze the current state of renewable energy markets",
      icon: "📊"
    },
    {
      title: "Health & Medicine",
      query: "Recent developments in cancer treatment research",
      icon: "🏥"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
    >
      <div className="relative mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
          <Search className="w-12 h-12 text-white" />
        </div>
        <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-3xl blur-xl opacity-75"></div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-6 border border-dashed border-blue-500/30 rounded-3xl"
        ></motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Touch
          </span>
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="grid grid-cols-1 mt-4 md:grid-cols-2 gap-4 max-w-4xl w-full"
      >
        {examples.map((example, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onExampleClick(example.query)}
            className="group p-6 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl text-left hover:border-gray-600/50 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl">{example.icon}</div>
              <div>
                <h3 className="font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {example.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {example.query}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

// Current Step Indicator Component
function CurrentStepIndicator({ step }: { step: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex justify-start mb-6"
    >
      <div className="bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Loader className="w-4 h-4 animate-spin text-blue-400" />
            <div className="absolute inset-0 w-4 h-4 animate-ping text-blue-400 opacity-30">
              <Loader className="w-4 h-4" />
            </div>
          </div>
          <span className="text-sm text-blue-200">{step}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsLoading(false);
    setCurrentStep('');
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const query = input;
    setInput('');
    setIsLoading(true);
    setCurrentStep('Initializing research...');

    // Create assistant message placeholder
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      type: 'assistant',
      content: '',
      sources: [],
      research_steps: [],
      timestamp: new Date(),
      isStreaming: true,
      showSteps: false,
      showSources: false,
      showContent: false,
      researchComplete: false
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Use EventSource for streaming
      const eventSource = new EventSource(
        `${API_BASE}/api/research/stream?query=${encodeURIComponent(query)}`,
        { }
      );
      
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Stream opened');
      };

      eventSource.onmessage = (event) => {
        try {
          const streamEvent: StreamEvent = JSON.parse(event.data);
          
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantId) {
              const updatedMsg = { ...msg };
              
              switch (streamEvent.type) {
                case 'research_step':
                  setCurrentStep(streamEvent.data.description);
                  updatedMsg.research_steps = [
                    ...(updatedMsg.research_steps || []),
                    streamEvent.data
                  ];
                  updatedMsg.showSteps = true;
                  break;
                
                case 'sources':
                  updatedMsg.sources = streamEvent.data.sources;
                  updatedMsg.showSources = true;
                  updatedMsg.researchComplete = true;
                  break;
                
                case 'start_synthesis':
                  if (updatedMsg.researchComplete) {
                    updatedMsg.showContent = true;
                    setCurrentStep('Generating comprehensive answer...');
                  }
                  break;
                
                case 'content_chunk':
                  if (updatedMsg.researchComplete) {
                    updatedMsg.content += streamEvent.data.chunk;
                    updatedMsg.showContent = true;
                  }
                  break;
                
                case 'complete':
                  updatedMsg.isStreaming = false;
                  updatedMsg.confidence_score = streamEvent.data.confidence_score;
                  updatedMsg.processing_time = streamEvent.data.processing_time;
                  updatedMsg.showContent = true;
                  setIsLoading(false);
                  setCurrentStep('');
                  eventSource.close();
                  eventSourceRef.current = null;
                  setAbortController(null);
                  break;
                
                case 'error':
                  updatedMsg.content = streamEvent.data.message || 'An error occurred during research';
                  updatedMsg.isStreaming = false;
                  updatedMsg.showContent = true;
                  setIsLoading(false);
                  setCurrentStep('');
                  eventSource.close();
                  eventSourceRef.current = null;
                  setAbortController(null);
                  break;
              }
              
              return updatedMsg;
            }
            return msg;
          }));
        } catch (error) {
          console.error('Error parsing stream event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setMessages(prev => prev.map(msg => {
          if (msg.id === assistantId && msg.isStreaming) {
            return {
              ...msg,
              content: msg.content || 'Sorry, I encountered an error while researching your query. Please try again.',
              isStreaming: false,
              showContent: true
            };
          }
          return msg;
        }));
        setIsLoading(false);
        setCurrentStep('');
        eventSource.close();
        eventSourceRef.current = null;
        setAbortController(null);
      };

    } catch (error) {
      console.error('Stream setup error:', error);
      setMessages(prev => prev.map(msg => {
        if (msg.id === assistantId) {
          return {
            ...msg,
            content: 'Sorry, I encountered an error while researching your query. Please try again.',
            isStreaming: false,
            showContent: true
          };
        }
        return msg;
      }));
      setIsLoading(false);
      setCurrentStep('');
      setAbortController(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.1),transparent_50%)]"></div>
      
      {/* Header */}
      <Header isLoading={isLoading} onStop={stopStreaming} />

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-32">
        <div className="max-w-5xl mx-auto px-6">
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              <WelcomeScreen onExampleClick={setInput} />
            ) : (
              <div className="space-y-8">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-4xl w-full ${message.type === 'user' ? 'ml-8' : 'mr-8'}`}>
                      
                      {/* User Message */}
                      {message.type === 'user' && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="ml-auto max-w-2xl"
                        >
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl px-6 py-4 shadow-2xl">
                            <p className="text-white leading-relaxed whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Assistant Response Components */}
                      {message.type === 'assistant' && (
                        <div className="space-y-6">
                          {/* Research Steps */}
                          <ResearchSteps 
                            steps={message.research_steps || []} 
                            isVisible={message.showSteps || false} 
                          />

                          {/* Sources */}
                          <Sources 
                            sources={message.sources || []} 
                            isVisible={message.showSources || false} 
                          />

                          {/* Answer Content */}
                          <MessageContent
                            content={message.content}
                            isStreaming={message.isStreaming || false}
                            isVisible={message.showContent || false}
                            confidence_score={message.confidence_score}
                            processing_time={message.processing_time}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Current Step Indicator */}
                <AnimatePresence>
                  {isLoading && currentStep && (
                    <CurrentStepIndicator step={currentStep} />
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        </div>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <InputSection
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}