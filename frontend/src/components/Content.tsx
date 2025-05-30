import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import Markdown from 'react-markdown';

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

  console.log(content)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden"
    >
      <div className="p-6">
        <div className="prose prose-invert prose-sm max-w-none">
          {content ? (
            <Markdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-white mt-8 mb-6 first:mt-0 leading-tight">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-white mt-8 mb-4 first:mt-0 leading-tight">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-white mt-6 mb-3 first:mt-0 leading-tight">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-base font-semibold text-white mt-4 mb-2 first:mt-0 leading-tight">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="mb-4 text-gray-300 leading-relaxed last:mb-0 text-sm">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-6 ml-0 space-y-3 list-none">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-6 ml-6 space-y-3 list-decimal">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-300 flex items-start gap-3 text-sm leading-relaxed">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2.5 flex-shrink-0"></span>
                    <span className="flex-1">{children}</span>
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-300">{children}</em>
                ),
                code: ({ children }) => (
                  <code className="px-2 py-1 bg-gray-900/50 text-blue-400 rounded text-xs font-mono border border-gray-700/50">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 py-3 my-6 bg-gray-900/30 rounded-r-lg italic">
                    <div className="text-gray-300 text-sm">
                      {children}
                    </div>
                  </blockquote>
                ),
                a: ({ children, href }) => (
                  <a 
                    href={href} 
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full border border-gray-700 rounded-lg">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gray-800/50">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2 text-left text-white font-semibold border-b border-gray-700 text-sm">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2 text-gray-300 border-b border-gray-700/50 text-sm">
                    {children}
                  </td>
                ),
                hr: () => (
                  <hr className="my-6 border-gray-700/50" />
                )
              }}
            >
              {content}
            </Markdown>
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