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
import { memo } from 'react';

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
  type: 'research_step' | 'content_chunk' | 'sources' | 'complete' | 'error' | 'start_synthesis' | "connected";
  data: any;
}


const API_BASE = 'http://localhost:8000';



interface ExampleItem {
  title: string;
  query: string;
  icon: string;
  description?: string;
}

interface WelcomeScreenProps {
  onExampleClick: (text: string) => void;
}

const WelcomeScreen = memo(({ onExampleClick }: WelcomeScreenProps) => {
  const examples: ExampleItem[] = [
    {
      title: "AI & Technology",
      query: "Compare the latest AI models and their capabilities",
      icon: "🤖",
      description: "Explore cutting-edge AI developments"
    },
    {
      title: "Science & Research",
      query: "Latest breakthroughs in quantum computing",
      icon: "🔬",
      description: "Discover recent scientific advances"
    },
    {
      title: "Business & Markets",
      query: "Analyze the current state of renewable energy markets",
      icon: "📊",
      description: "Get insights on market trends"
    },
    {
      title: "Health & Medicine",
      query: "Recent developments in cancer treatment research",
      icon: "🏥",
      description: "Learn about medical breakthroughs"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-full max-h-[calc(100vh-200px)] overflow-y-auto text-center px-6 py-4"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative mb-2 mt-8"
      >
        {/* Main Icon Container */}
        <div className="relative">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/25">
            <Search className="w-6 h-6 text-white drop-shadow-lg" />
          </div>
          
          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-75 animate-pulse"></div>
          
          {/* Rotating Border */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-6 border-blue-400/30 rounded-3xl"
          />
          
          {/* Floating Sparkles */}
          <motion.div
            animate={{ 
              y: [-10, 10, -10],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute -top-2 -right-2 text-yellow-400"
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
        </div>
      </motion.div>

      {/* Title Section */}
      <motion.div
        variants={itemVariants}
        className="mb-4"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Touch
          </span>
        </h1>
        <p className="text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Discover insights across technology, science, business, and health. 
          Choose a topic below to get started.
        </p>
      </motion.div>

      {/* Examples Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full mt-6"
      >
        {examples.map((example, index) => (
          <motion.button
            key={`${example.title}-${index}`}
            variants={itemVariants}
            whileHover={{ 
              scale: 1.03, 
              y: -4,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onExampleClick(example.query)}
            className="group relative p-5 bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl text-left hover:border-gray-600/70 hover:bg-gray-800/80 transition-all duration-300 overflow-hidden"
            aria-label={`Search for: ${example.query}`}
          >
            {/* Hover Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            
            <div className="relative flex items-start gap-4">
              <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                {example.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300 text-md">
                  {example.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                  "{example.query}"
                </p>
              </div>
            </div>
            
            {/* Subtle shine effect on hover */}
            <div className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:left-full transition-all duration-700" />
          </motion.button>
        ))}
      </motion.div>

      {/* Footer Text */}
      <motion.div
        variants={itemVariants}
        className="mt-6 text-gray-400 text-sm"
      >
        Click any example above or start typing your own query
      </motion.div>
    </motion.div>
  );
});


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
  
    // Create abort controller
    const controller = new AbortController();
    setAbortController(controller);
  
    try {
      console.log('🔗 Creating EventSource for:', query);
      
      // FIXED: Proper URL encoding and connection
      const encodedQuery = encodeURIComponent(query);
      const streamUrl = `${API_BASE}/api/research/stream?query=${encodedQuery}`;
      console.log('📡 Stream URL:', streamUrl);
      
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;
  
      eventSource.onopen = (event) => {
        console.log('✅ EventSource opened', event);
      };
  
      eventSource.onmessage = (event) => {
        console.log('📨 Received:', event.data);
        
        try {
          const streamEvent: StreamEvent = JSON.parse(event.data);
          console.log('📋 Parsed event:', streamEvent.type, streamEvent.data);
          
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantId) {
              const updatedMsg = { ...msg };
              
              switch (streamEvent.type) {
                case 'connected':
                  console.log('🔗 Stream connected');
                  break;
                  
                case 'research_step':
                  console.log('👣 Research step:', streamEvent.data.description);
                  setCurrentStep(streamEvent.data.description);
                  updatedMsg.research_steps = [
                    ...(updatedMsg.research_steps || []),
                    streamEvent.data
                  ];
                  updatedMsg.showSteps = true;
                  break;
                
                case 'sources':
                  console.log('📚 Sources received:', streamEvent.data.sources.length);
                  updatedMsg.sources = streamEvent.data.sources;
                  updatedMsg.showSources = true;
                  // FIXED: Set researchComplete when sources arrive
                  updatedMsg.researchComplete = true;
                  break;
                
                case 'start_synthesis':
                  console.log('🎯 Starting synthesis');
                  setCurrentStep('Generating comprehensive answer...');
                  updatedMsg.showContent = true; // FIXED: Show content area immediately
                  break;
                
                case 'content_chunk':
                  console.log('📝 Content chunk:', streamEvent.data.chunk.substring(0, 20) + '...');
                  updatedMsg.content += streamEvent.data.chunk;
                  updatedMsg.showContent = true;
                  break;
                
                case 'complete':
                  console.log('✅ Stream completed');
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
                  console.error('❌ Stream error:', streamEvent.data.message);
                  updatedMsg.content = streamEvent.data.message || 'An error occurred during research';
                  updatedMsg.isStreaming = false;
                  updatedMsg.showContent = true;
                  setIsLoading(false);
                  setCurrentStep('');
                  eventSource.close();
                  eventSourceRef.current = null;
                  setAbortController(null);
                  break;
                  
                default:
                  console.log('❓ Unknown event type:', streamEvent.type);
              }
              
              return updatedMsg;
            }
            return msg;
          }));
        } catch (error) {
          console.error('❌ Error parsing stream event:', error, 'Raw data:', event.data);
        }
      };
  
      eventSource.onerror = (error) => {
        console.error('❌ EventSource error:', error);
        console.log('EventSource readyState:', eventSource.readyState);
        console.log('EventSource url:', eventSource.url);
        
        setMessages(prev => prev.map(msg => {
          if (msg.id === assistantId && msg.isStreaming) {
            return {
              ...msg,
              content: msg.content || 'Sorry, I encountered a connection error. Please try again.',
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
      console.error('❌ Stream setup error:', error);
      setMessages(prev => prev.map(msg => {
        if (msg.id === assistantId) {
          return {
            ...msg,
            content: 'Sorry, I encountered an error setting up the connection. Please try again.',
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