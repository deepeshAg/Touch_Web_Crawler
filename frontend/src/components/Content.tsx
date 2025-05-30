"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'


interface MessageContentProps {
  content: string;
  isStreaming: boolean;
  isVisible: boolean;
  confidence_score?: number;
  processing_time?: number;
}



export default function MessageContent({ 
  content, 
  isStreaming, 
  isVisible, 
  confidence_score, 
  processing_time 
}: MessageContentProps) {
  if (!isVisible) return null;



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden"
    >
      <div className="p-6">
        <div className="prose prose-invert prose-sm max-w-none">
          {  content ? (
                isStreaming ? (
                  <pre>{content}</pre> // render raw as plain text
                ) : (
                  <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>
                    {content}
                  </ReactMarkdown>
                )
          ) : (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm italic">Generating comprehensive answer...</span>
            </div>
          )}
          
          {isStreaming && content && (
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="inline-block w-0.5 h-5 bg-blue-400 ml-1"
            />
          )}
        </div>
        
        {confidence_score && !isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 pt-4 border-t border-gray-700/50 flex items-center justify-between"
          >
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span>Confidence: {Math.round(confidence_score * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <span>{processing_time?.toFixed(1)}s processing time</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}