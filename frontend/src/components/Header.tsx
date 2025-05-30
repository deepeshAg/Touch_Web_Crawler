import React from 'react';
import { motion } from 'framer-motion';
import { Search, Globe, StopCircle } from 'lucide-react';

interface HeaderProps {
  isLoading: boolean;
  onStop: () => void;
}

export default function Header({ isLoading, onStop }: HeaderProps) {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl blur opacity-75"></div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Touch</h1>
              <p className="text-sm text-gray-400">AI Research Assistant</p>
            </div>
          </div>

          {/* Status Section */}
          <div className="flex items-center gap-4">
            {isLoading && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={onStop}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
              >
                <StopCircle className="w-4 h-4" />
                Stop
              </motion.button>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Globe className="w-4 h-4" />
              <span>Web-enabled</span>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}