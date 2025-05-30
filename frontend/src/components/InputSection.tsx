import React from 'react';
import { motion } from 'framer-motion';
import { Send, Loader } from 'lucide-react';

interface InputSectionProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function InputSection({ 
  input, 
  setInput, 
  isLoading, 
  onSubmit, 
  onKeyDown 
}: InputSectionProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 ">
      <div className="max-w-4xl mx-auto p-6">
        <div className="relative">
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to research anything..."
                className="w-full resize-none bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 scrollbar-hide"
                rows={1}
                style={{
                  minHeight: '56px',
                  maxHeight: '140px',
                  height: Math.min(140, Math.max(56, input.split('\n').length * 24 + 32))
                }}
                onKeyDown={onKeyDown}
                disabled={isLoading}
              />
              
              {/* Character count for long inputs */}
              {input.length > 100 && (
                <div className="absolute bottom-2 right-20 text-xs text-gray-500">
                  {input.length}/2000
                </div>
              )}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSubmit}
              disabled={!input.trim() || isLoading}
              className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl px-8 py-4 font-medium transition-all duration-200 hover:shadow-2xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3 min-h-[56px]"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">Researching</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  <span className="hidden sm:inline">Research</span>
                </>
              )}
            </motion.button>
          </div>

        </div>
      </div>
    </div>
  );
}